import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator
from django.conf import settings
from accounts.models import User
from cases.models import Case, JudgeAssignment

class Decision(models.Model):
    """Court Decision/Judgment Model"""
    class DecisionType(models.TextChoices):
        INTERIM = 'INTERIM', 'Interim Order'
        FINAL = 'FINAL', 'Final Judgment'
        DISMISSAL = 'DISMISSAL', 'Dismissal'
        SETTLEMENT = 'SETTLEMENT', 'Settlement Approval'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='decisions')
    judge = models.ForeignKey(User, on_delete=models.PROTECT, related_name='decisions_issued')
    
    # Decision details
    title = models.CharField(max_length=200)
    decision_type = models.CharField(max_length=20, choices=DecisionType.choices)
    decision_number = models.CharField(max_length=50, unique=True)
    
    # Content
    introduction = models.TextField()
    background = models.TextField()
    analysis = models.TextField()
    conclusion = models.TextField()
    order = models.TextField(help_text="The final order/ruling")
    
    # Legal references
    laws_cited = models.TextField(blank=True, null=True)
    cases_cited = models.TextField(blank=True, null=True)
    
    # Documents
    pdf_document = models.FileField(
        upload_to='decisions/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
        null=True,
        blank=True
    )
    
    # Status
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['decision_number']),
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['judge', '-created_at']),
        ]
        permissions = [
            ('can_publish_decision', 'Can publish decision'),
        ]

    def __str__(self):
        return f"{self.decision_number} - {self.case.file_number}"

    def save(self, *args, **kwargs):
        if not self.decision_number:
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
            sequence = int(last_number.split('-')[-1]) + 1
        else:
            sequence = 1
        
        return f"{prefix}-{sequence:04d}"


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