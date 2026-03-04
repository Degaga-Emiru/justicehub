import uuid
import hashlib
import os
from django.db import models
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Q
from accounts.models import User

from core.models import SoftDeleteModel

class CaseCategory(models.Model):
    """Legal case classification"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=20, unique=True, help_text="Category code (e.g., CIV-001)")
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Required fee for this category")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Case Categories"
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class CaseStatus(models.Model):
    """Case Status Model"""
    class StatusChoices(models.TextChoices):
        PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        PAID = 'PAID', 'Paid'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, choices=StatusChoices.choices, unique=True)

    class Meta:
        verbose_name_plural = "Case Statuses"
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()


class Case(SoftDeleteModel):
    """Main Case Model"""
    
    # Status Flow Definition
    STATUS_FLOW = {
        CaseStatus.StatusChoices.PENDING_REVIEW: [CaseStatus.StatusChoices.APPROVED, CaseStatus.StatusChoices.REJECTED],
        CaseStatus.StatusChoices.APPROVED: [CaseStatus.StatusChoices.PAID],
        CaseStatus.StatusChoices.PAID: [CaseStatus.StatusChoices.ASSIGNED],
        CaseStatus.StatusChoices.ASSIGNED: [CaseStatus.StatusChoices.IN_PROGRESS],
        CaseStatus.StatusChoices.IN_PROGRESS: [CaseStatus.StatusChoices.CLOSED],
    }

    class Priority(models.TextChoices):

        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField()
    case_summary = models.TextField(blank=True, null=True)
    
    # Foreign Keys
    category = models.ForeignKey(CaseCategory, on_delete=models.PROTECT, related_name='cases')
    status = models.CharField(
        max_length=20,
        choices=CaseStatus.StatusChoices.choices,
        default=CaseStatus.StatusChoices.PENDING_REVIEW,
        db_index=True
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    
    # Parties
    created_by = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='created_cases'
    )
    plaintiff = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='cases_as_plaintiff',
        null=True,
        blank=True
    )
    defendant = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='cases_as_defendant',
        null=True,
        blank=True
    )
    
    # Legal Representatives
    plaintiff_lawyer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plaintiff_cases'
    )
    defendant_lawyer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='defendant_cases'
    )
    
    # Case Tracking
    file_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    court_name = models.CharField(max_length=200, blank=True, null=True)
    court_room = models.CharField(max_length=50, blank=True, null=True)
    
    # Review Information
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_cases'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)
    
    # Dates
    filing_date = models.DateTimeField(default=timezone.now)
    closed_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['file_number']),
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['priority']),
            models.Index(fields=['plaintiff', 'defendant']),
        ]
        permissions = [
            ('can_assign_judge', 'Can assign judge to case'),
            ('can_review_case', 'Can review case'),
            ('can_manage_documents', 'Can manage case documents'),
        ]

    def __str__(self):
        return f"{self.file_number or 'PENDING'} - {self.title}"

    def clean(self):
        super().clean()
        
        # 1.1: Party Role Constraints
        if self.plaintiff and self.defendant and self.plaintiff == self.defendant:
            raise ValidationError("A person cannot be both Plaintiff and Defendant in the same case.")
        
        # 12.1: A closed case cannot be edited.
        if not self._state.adding:
            old_instance = Case.all_objects.get(pk=self.pk)
            if old_instance.status == CaseStatus.StatusChoices.CLOSED:
                raise ValidationError("A closed case cannot be modified.")

    def save(self, *args, **kwargs):
        self.clean()
        
        # 2.2: Strict Status Flow Enforcement
        if not self._state.adding:
            old_instance = Case.all_objects.get(pk=self.pk)
            if old_instance.status != self.status:
                allowed_next = self.STATUS_FLOW.get(old_instance.status, [])
                if self.status not in allowed_next:
                    raise ValidationError(
                        f"Invalid status transition from {old_instance.status} to {self.status}. "
                        f"Allowed transitions: {', '.join(allowed_next)}"
                    )

        # Auto-generate file number if status changes to APPROVED
        if self.status == CaseStatus.StatusChoices.APPROVED and not self.file_number:
            self.file_number = self.generate_file_number()
        super().save(*args, **kwargs)


    def generate_file_number(self):
        """Generate unique file number in format: JH-YYYY-XXXX"""
        from django.db.models import Max
        import datetime
        
        current_year = datetime.datetime.now().year
        prefix = f"JH-{current_year}"
        
        last_case = Case.objects.filter(
            file_number__startswith=prefix
        ).aggregate(Max('file_number'))
        
        last_number = last_case['file_number__max']
        
        if last_number:
            try:
                sequence = int(last_number.split('-')[-1]) + 1
            except (ValueError, IndexError):
                sequence = 1
        else:
            sequence = 1
        
        return f"{prefix}-{sequence:04d}"

    @property
    def is_pending(self):
        return self.status in [CaseStatus.StatusChoices.PENDING_REVIEW, CaseStatus.StatusChoices.ASSIGNED]

    @property
    def is_active(self):
        return self.status in [CaseStatus.StatusChoices.ASSIGNED, CaseStatus.StatusChoices.IN_PROGRESS]

    @property
    def is_closed(self):
        return self.status == CaseStatus.StatusChoices.CLOSED


class CaseDocument(models.Model):
    """Case Documents Model"""
    class DocumentType(models.TextChoices):
        PETITION = 'PETITION', 'Petition'
        EVIDENCE = 'EVIDENCE', 'Evidence'
        AFFIDAVIT = 'AFFIDAVIT', 'Affidavit'
        ORDER = 'ORDER', 'Court Order'
        JUDGMENT = 'JUDGMENT', 'Judgment'
        OTHER = 'OTHER', 'Other'

    ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='documents')
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='uploaded_documents')
    
    file = models.FileField(
        upload_to='case_documents/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS)]
    )
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    file_type = models.CharField(max_length=10)
    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.OTHER
    )
    description = models.TextField(blank=True, null=True)
    
    # Security
    checksum = models.CharField(max_length=64)  # SHA-256
    is_confidential = models.BooleanField(default=False)
    
    # Tracking
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['case', 'document_type']),
            models.Index(fields=['uploaded_by', 'uploaded_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['case', 'checksum'],
                name='unique_checksum_per_case'
            )
        ]

    def __str__(self):
        return f"{self.file_name} - {self.case.file_number}"

    def save(self, *args, **kwargs):
        if self.file and not self.file_size:
            self.file_size = self.file.size
            self.file_name = self.file.name
            
            # Calculate checksum
            sha256 = hashlib.sha256()
            for chunk in self.file.chunks():
                sha256.update(chunk)
            self.checksum = sha256.hexdigest()
            
            # Get file extension
            _, ext = os.path.splitext(self.file.name)
            self.file_type = ext[1:].lower() if ext else ''
        
        super().save(*args, **kwargs)

    def clean(self):
        if self.file and self.file.size > self.MAX_FILE_SIZE:
            raise ValidationError(f"File size cannot exceed {self.MAX_FILE_SIZE // (1024*1024)}MB")


class JudgeProfile(models.Model):
    """Judge Profile Model - This was missing"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='judge_profile')
    specializations = models.ManyToManyField(CaseCategory, related_name='judges')
    max_active_cases = models.IntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(10)])
    bar_certificate_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    years_of_experience = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Judge Profile"
        verbose_name_plural = "Judge Profiles"

    def __str__(self):
        return f"Judge {self.user.get_full_name()}"

    def get_active_case_count(self):
        """Get number of active cases assigned to this judge"""
        return JudgeAssignment.objects.filter(
            judge=self.user,
            is_active=True
        ).count()

    def can_take_more_cases(self):
        """Check if judge can take more cases"""
        return self.get_active_case_count() < self.max_active_cases


class JudgeAssignment(models.Model):
    """Judge Assignment Model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='judge_assignments')
    judge = models.ForeignKey(User, on_delete=models.PROTECT, related_name='case_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='assignments_made')
    
    assigned_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Assignment details
    assignment_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['judge', 'is_active']),
            models.Index(fields=['case', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['case', 'is_active'],
                condition=Q(is_active=True),
                name='unique_active_assignment_per_case'
            )
        ]

    def __str__(self):
        return f"Case {self.case.file_number} -> Judge {self.judge.get_full_name()}"

    def clean(self):
        """Validate judge assignment limits"""
        if self.is_active:
            # Check if judge already has max active cases
            judge_profile = JudgeProfile.objects.filter(user=self.judge).first()
            if judge_profile:
                active_count = JudgeAssignment.objects.filter(
                    judge=self.judge,
                    is_active=True
                ).exclude(pk=self.pk).count()
                
                if active_count >= judge_profile.max_active_cases:
                    raise ValidationError("Judge already has maximum active cases assigned.")


class CaseNotes(models.Model):
    """Internal case notes for judges and staff"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(User, on_delete=models.PROTECT, related_name='case_notes')
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_private = models.BooleanField(default=True)  # Private to author only
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Case Notes"

    def __str__(self):
        return f"{self.title} - {self.case.file_number}"