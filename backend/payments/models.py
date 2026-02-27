import uuid
from django.db import models
from django.conf import settings
from cases.models import Case

class Payment(models.Model):
    """Stores manual bank transfer details submitted by user"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='payments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_reference = models.CharField(max_length=100, unique=True, help_text="Bank transfer reference number")
    payment_method = models.CharField(max_length=50, default='BANK_TRANSFER')
    sender_name = models.CharField(max_length=255)
    bank_name = models.CharField(max_length=100)
    transaction_date = models.DateField()
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending Verification'),
            ('VERIFIED', 'Verified'),
            ('FAILED', 'Failed/Rejected'),
        ],
        default='PENDING'
    )
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transaction_reference']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Payment {self.transaction_reference} - {self.case.file_number}"


class Transaction(models.Model):
    """Audit record for financial transactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT, related_name='transaction_record')
    transaction_id = models.CharField(max_length=100, unique=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict)
    
    def __str__(self):
        return f"TXN-{self.transaction_id}"
