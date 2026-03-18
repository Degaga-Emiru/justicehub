import uuid
from django.db import models
from django.conf import settings
from cases.models import Case

class Payment(models.Model):
    """Stores payment details including Chapa integration data"""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        VERIFIED = 'VERIFIED', 'Verified'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='payments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tx_ref = models.CharField(max_length=100, unique=True, null=True, blank=True)
    payment_method = models.CharField(max_length=50, default='CHAPA')
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    payment_url = models.URLField(max_length=500, blank=True, null=True)
    chapa_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    paid_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tx_ref']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Payment {self.tx_ref} - {self.case.file_number}"


class Transaction(models.Model):
    """Financial transaction record synced from payment provider"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT, related_name='transaction_record')
    transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    chapa_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict)
    
    def __str__(self):
        return f"TXN-{self.transaction_id or self.id}"
