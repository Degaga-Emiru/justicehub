import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator
from django.conf import settings
from accounts.models import User
from cases.models import Case, JudgeAssignment

class Decision(models.Model):
    """Court Decision/Judgment Model with Workflow States"""
    class DecisionType(models.TextChoices):
        INTERIM = 'INTERIM', 'Interim Order'
        FINAL = 'FINAL', 'Final Judgment'
        DISMISSAL = 'DISMISSAL', 'Dismissal'
        SETTLEMENT = 'SETTLEMENT', 'Settlement Approval'
        IMMEDIATE = 'IMMEDIATE', 'Immediate Decision'
        OTHER = 'OTHER', 'Other'

    class ImmediateReason(models.TextChoices):
        MEDIATED = 'MEDIATED', 'Solved by mediated'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn by the plaintiff'

    class DecisionStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        FINALIZED = 'FINALIZED', 'Finalized'
        PUBLISHED = 'PUBLISHED', 'Published'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='decisions')
    judge = models.ForeignKey(User, on_delete=models.PROTECT, related_name='decisions_issued')
    
    # Decision details
    title = models.CharField(max_length=200)
    decision_type = models.CharField(max_length=20, choices=DecisionType.choices)
    decision_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    
    # Workflow fields
    status = models.CharField(
        max_length=20, 
        choices=DecisionStatus.choices, 
        default=DecisionStatus.DRAFT
    )
    version = models.PositiveIntegerField(default=1)
    
    # Content
    introduction = models.TextField(null=True, blank=True)
    background = models.TextField(null=True, blank=True)
    analysis = models.TextField(null=True, blank=True)
    conclusion = models.TextField(null=True, blank=True)
    order = models.TextField(null=True, blank=True, help_text="The final order/ruling")
    
    # Immediate Decision fields
    immediate_reason = models.CharField(
        max_length=20, 
        choices=ImmediateReason.choices,
        null=True,
        blank=True
    )
    description = models.TextField(null=True, blank=True)
    finalized = models.BooleanField(default=False)
    
    # Legal references
    laws_cited = models.TextField(blank=True, null=True)
    cases_cited = models.TextField(blank=True, null=True)
    
    # Documents
    document = models.ForeignKey(
        'cases.CaseDocument',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decisions_uploaded'
    )
    
    pdf_document = models.FileField(
        upload_to='decisions/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
        null=True,
        blank=True
    )
    
    # Keep is_published for backward compatibility/legacy logic if needed
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['decision_number']),
            models.Index(fields=['status']),
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['judge', '-created_at']),
        ]
        permissions = [
            ('can_publish_decision', 'Can publish decision'),
            ('can_finalize_decision', 'Can finalize decision'),
        ]

    def __str__(self):
        return f"{self.decision_number or 'DRAFT'} - {self.case.file_number}"

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        
        if self.decision_type == self.DecisionType.IMMEDIATE:
            if not self.immediate_reason:
                raise ValidationError({'immediate_reason': "Reason is required for immediate decisions."})
            if not self.description:
                raise ValidationError({'description': "Description is required for immediate decisions."})
        else:
            errors = {}
            if not self.introduction:
                errors['introduction'] = "Introduction is required."
            if not self.background:
                errors['background'] = "Background is required."
            if not self.analysis:
                errors['analysis'] = "Analysis is required."
            if not self.conclusion:
                errors['conclusion'] = "Conclusion is required."
            if not self.order:
                errors['order'] = "Order is required."
            
            if errors:
                raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        if not self.decision_number and self.status != self.DecisionStatus.DRAFT:
            self.decision_number = self.generate_decision_number()
        super().save(*args, **kwargs)

    def generate_decision_number(self):
        """Generate unique decision number"""
        from django.db.models import Max
        import datetime
        
        current_year = datetime.datetime.now().year
        prefix = f"JD-{current_year}"
        
        last_decision = Decision.objects.filter(
            decision_number__startswith=prefix
        ).aggregate(Max('decision_number'))
        
        last_number = last_decision['decision_number__max']
        
        if last_number:
            try:
                sequence = int(last_number.split('-')[-1]) + 1
            except (ValueError, IndexError):
                sequence = 1
        else:
            sequence = 1
        
        return f"{prefix}-{sequence:04d}"


class DecisionVersion(models.Model):
    """Snapshot of a decision draft"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='versions')
    version = models.PositiveIntegerField()
    
    title = models.CharField(max_length=200)
    introduction = models.TextField()
    background = models.TextField()
    analysis = models.TextField()
    conclusion = models.TextField()
    order = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-version']
        unique_together = ['decision', 'version']


class DecisionComment(models.Model):
    """Feedback from Judge/Registrar during review"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']


class DecisionDelivery(models.Model):
    """Track decision delivery to parties"""
    class DeliveryMethod(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        PERSONAL = 'PERSONAL', 'Personal Service'
        POST = 'POST', 'Postal Mail'
        PORTAL = 'PORTAL', 'Online Portal'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='deliveries')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_decisions')
    
    method = models.CharField(max_length=20, choices=DeliveryMethod.choices)
    delivered_at = models.DateTimeField(default=timezone.now)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    delivery_address = models.TextField(blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        ordering = ['-delivered_at']
        unique_together = ['decision', 'recipient']


