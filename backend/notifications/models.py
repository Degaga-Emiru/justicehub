import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings
from accounts.models import User
from cases.models import Case

class Notification(models.Model):
    """In-app notification model"""
    class NotificationType(models.TextChoices):
        CASE_SUBMITTED = 'CASE_SUBMITTED', 'Case Submitted'
        CASE_ACCEPTED = 'CASE_ACCEPTED', 'Case Accepted'
        CASE_REJECTED = 'CASE_REJECTED', 'Case Rejected'
        JUDGE_ASSIGNED = 'JUDGE_ASSIGNED', 'Judge Assigned'
        HEARING_SCHEDULED = 'HEARING_SCHEDULED', 'Hearing Scheduled'
        HEARING_REMINDER = 'HEARING_REMINDER', 'Hearing Reminder'
        HEARING_CANCELLED = 'HEARING_CANCELLED', 'Hearing Cancelled'
        DECISION_ISSUED = 'DECISION_ISSUED', 'Decision Issued'
        DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED', 'Document Uploaded'
        DEADLINE_REMINDER = 'DEADLINE_REMINDER', 'Deadline Reminder'
        SYSTEM_ALERT = 'SYSTEM_ALERT', 'System Alert'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    
    # Content
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Rich content
    action_url = models.URLField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Tracking
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    push_sent = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.type}: {self.title} - {self.user.email}"

    def mark_as_read(self):
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])


class NotificationPreference(models.Model):
    """User notification preferences"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Channels
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # Types to receive
    case_updates = models.BooleanField(default=True)
    hearing_updates = models.BooleanField(default=True)
    decision_updates = models.BooleanField(default=True)
    document_updates = models.BooleanField(default=True)
    system_alerts = models.BooleanField(default=True)
    
    # Quiet hours
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"