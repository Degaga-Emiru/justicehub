import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.conf import settings
from accounts.models import User
from cases.models import Case, SoftDeleteModel

class Hearing(SoftDeleteModel):
    """Hearing/Scheduling Model"""
    class HearingType(models.TextChoices):
        INITIAL = 'INITIAL', 'Initial Hearing'
        INTRO = 'INTRO', 'Case Introduction'
        EVIDENCE = 'EVIDENCE', 'Evidence Hearing'
        WITNESS = 'WITNESS', 'Witness Hearing'
        ARGUMENT = 'ARGUMENT', 'Argument Hearing'
        FINAL = 'FINAL', 'Final Hearing'
        FINAL_ARGUMENT = 'FINAL_ARGUMENT', 'Final Argument'
        JUDGMENT = 'JUDGMENT', 'Judgment'
        STATUS = 'STATUS', 'Status Conference'
        EVIDENTIARY = 'EVIDENTIARY', 'Evidentiary Hearing'
        MOTION = 'MOTION', 'Motion Hearing'
        TRIAL = 'TRIAL', 'Trial'
        OTHER = 'OTHER', 'Other'

    class HearingAction(models.TextChoices):
        RESOLVED = 'RESOLVED', 'Resolved'
        POSTPONED = 'POSTPONED', 'Postponed'
        CONTINUED = 'CONTINUED', 'Continued'
        ADJOURNED = 'ADJOURNED', 'Adjourned'

    class HearingStatus(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        CONDUCTED = 'CONDUCTED', 'Conducted'
        COMPLETED = 'COMPLETED', 'Completed'
        POSTPONED = 'POSTPONED', 'Postponed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        RESCHEDULED = 'RESCHEDULED', 'Rescheduled'

    class HearingFormat(models.TextChoices):
        PHYSICAL = 'PHYSICAL', 'Physical Hearing'
        VIRTUAL = 'VIRTUAL', 'Virtual Hearing'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='hearings')
    judge = models.ForeignKey(User, on_delete=models.PROTECT, related_name='presiding_hearings')
    previous_hearing = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='next_hearings'
    )
    
    hearing_number = models.IntegerField(null=True, blank=True, help_text="Sequence number of the hearing for this case")
    
    # Scheduling
    title = models.CharField(max_length=200)
    hearing_type = models.CharField(max_length=20, choices=HearingType.choices)
    hearing_format = models.CharField(max_length=20, choices=HearingFormat.choices, default=HearingFormat.PHYSICAL)
    status = models.CharField(max_length=20, choices=HearingStatus.choices, default=HearingStatus.SCHEDULED)
    
    # Date and Location
    scheduled_date = models.DateTimeField()
    duration_minutes = models.IntegerField(validators=[MinValueValidator(15)])
    location = models.CharField(max_length=255)
    virtual_meeting_link = models.URLField(blank=True, null=True)
    
    # Details
    agenda = models.TextField()
    notes = models.JSONField(blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    action = models.CharField(max_length=50, choices=HearingAction.choices, blank=True, null=True)
    judge_comment = models.TextField(blank=True, null=True)
    next_hearing_date = models.DateTimeField(blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    is_public = models.BooleanField(default=False)
    
    # Participants tracking
    participants = models.ManyToManyField(
        User,
        through='HearingParticipant',
        related_name='hearings_participated'
    )
    
    # Recording/Transcript (Replaced by structured outcome fields)
    # recording_url = models.URLField(blank=True, null=True)
    # transcript_url = models.URLField(blank=True, null=True)
    minutes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    conducted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['scheduled_date']
        indexes = [
            models.Index(fields=['case', 'scheduled_date']),
            models.Index(fields=['judge', 'scheduled_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.hearing_type} - {self.case.file_number} - {self.scheduled_date}"

    def clean(self):
        super().clean()
        from cases.models import Case
        if self.case.status in [Case.StatusChoices.CLOSED, Case.StatusChoices.DECIDED]:
            from django.core.exceptions import ValidationError
            raise ValidationError(f"Cannot schedule hearings for a {self.case.get_status_display()} case.")

    def save(self, *args, **kwargs):
        self.clean()
        if self.hearing_number is None:
            # Automatically assign the next hearing number
            existing_count = Hearing.objects.filter(case=self.case).count()
            self.hearing_number = existing_count + 1

        if self.status == self.HearingStatus.CONDUCTED and not self.conducted_at:
            self.conducted_at = timezone.now()
        elif self.status == self.HearingStatus.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status == self.HearingStatus.CANCELLED and not self.cancelled_at:
            self.cancelled_at = timezone.now()
        super().save(*args, **kwargs)


class HearingParticipant(models.Model):
    """Track hearing participants and their attendance"""
    class ConfirmationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        DECLINED = 'DECLINED', 'Declined'

    class AttendanceStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
        LATE = 'LATE', 'Late'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hearing = models.ForeignKey(Hearing, on_delete=models.CASCADE, related_name='participant_list')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hearing_invitations')
    
    role_in_hearing = models.CharField(max_length=50)  # e.g., 'Plaintiff', 'Defendant', 'Lawyer', 'Witness'
    confirmation_status = models.CharField(
        max_length=20,
        choices=ConfirmationStatus.choices,
        default=ConfirmationStatus.PENDING
    )
    decline_reason = models.TextField(blank=True, null=True)
    attendance_status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PENDING
    )
    notes = models.TextField(blank=True, null=True)
    
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['hearing', 'user']
        ordering = ['hearing', 'role_in_hearing']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.hearing}"


class HearingReminder(models.Model):
    """Track reminders sent for hearings"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hearing = models.ForeignKey(Hearing, on_delete=models.CASCADE, related_name='reminders')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hearing_reminders')
    
    reminder_type = models.CharField(max_length=20)  # 'EMAIL', 'SMS', 'PUSH'
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scheduled_for']