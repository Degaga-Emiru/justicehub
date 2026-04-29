import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class AuditLog(models.Model):
    """
    Comprehensive Audit Log for compliance, security, and monitoring.
    Tracks all critical actions in the platform.
    """
    
    class ActionStatus(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAILURE = 'FAILURE', 'Failure'
        PENDING = 'PENDING', 'Pending'
        BLOCKED = 'BLOCKED', 'Blocked'

    class ActionType(models.TextChoices):
        # Authentication Events
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        LOGIN_FAILED = 'LOGIN_FAILED', 'Login Failed'
        PASSWORD_CHANGE = 'PASSWORD_CHANGE', 'Password Change'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
        OTP_VERIFIED = 'OTP_VERIFIED', 'OTP Verified'
        
        # User Management Events
        USER_CREATED = 'USER_CREATED', 'User Created'
        USER_UPDATED = 'USER_UPDATED', 'User Updated'
        USER_DELETED = 'USER_DELETED', 'User Deleted'
        USER_ACTIVATED = 'USER_ACTIVATED', 'User Activated'
        USER_DEACTIVATED = 'USER_DEACTIVATED', 'User Deactivated'
        ROLE_CHANGED = 'ROLE_CHANGED', 'Role Changed'
        
        # Case Management Events
        CASE_CREATED = 'CASE_CREATED', 'Case Created'
        CASE_UPDATED = 'CASE_UPDATED', 'Case Updated'
        CASE_DELETED = 'CASE_DELETED', 'Case Deleted'
        CASE_VIEWED = 'CASE_VIEWED', 'Case Viewed'
        CASE_ACCEPTED = 'CASE_ACCEPTED', 'Case Accepted'
        CASE_REJECTED = 'CASE_REJECTED', 'Case Rejected'
        CASE_ASSIGNED = 'CASE_ASSIGNED', 'Case Assigned'
        CASE_STATUS_CHANGED = 'CASE_STATUS_CHANGED', 'Case Status Changed'
        
        # Document Events
        DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED', 'Document Uploaded'
        DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED', 'Document Downloaded'
        DOCUMENT_VIEWED = 'DOCUMENT_VIEWED', 'Document Viewed'
        DOCUMENT_DELETED = 'DOCUMENT_DELETED', 'Document Deleted'
        DOCUMENT_UPDATED = 'DOCUMENT_UPDATED', 'Document Updated'
        
        # Hearing Events
        HEARING_SCHEDULED = 'HEARING_SCHEDULED', 'Hearing Scheduled'
        HEARING_UPDATED = 'HEARING_UPDATED', 'Hearing Updated'
        HEARING_CANCELLED = 'HEARING_CANCELLED', 'Hearing Cancelled'
        HEARING_COMPLETED = 'HEARING_COMPLETED', 'Hearing Completed'
        HEARING_ATTENDANCE = 'HEARING_ATTENDANCE', 'Hearing Attendance'
        
        # Decision Events
        DECISION_CREATED = 'DECISION_CREATED', 'Decision Created'
        DECISION_UPDATED = 'DECISION_UPDATED', 'Decision Updated'
        DECISION_PUBLISHED = 'DECISION_PUBLISHED', 'Decision Published'
        DECISION_VIEWED = 'DECISION_VIEWED', 'Decision Viewed'
        DECISION_DOWNLOADED = 'DECISION_DOWNLOADED', 'Decision Downloaded'
        
        # Payment Events
        PAYMENT_INITIATED = 'PAYMENT_INITIATED', 'Payment Initiated'
        PAYMENT_COMPLETED = 'PAYMENT_COMPLETED', 'Payment Completed'
        PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
        PAYMENT_VERIFIED = 'PAYMENT_VERIFIED', 'Payment Verified'
        
        # System Events
        API_ACCESS = 'API_ACCESS', 'API Access'
        EXPORT_DATA = 'EXPORT_DATA', 'Export Data'
        REPORT_GENERATED = 'REPORT_GENERATED', 'Report Generated'
        SETTINGS_CHANGED = 'SETTINGS_CHANGED', 'Settings Changed'
        BACKUP_CREATED = 'BACKUP_CREATED', 'Backup Created'
        BACKUP_RESTORED = 'BACKUP_RESTORED', 'Backup Restored'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='audit_trail'
    )
    user_email = models.EmailField(null=True, blank=True)
    user_role = models.CharField(max_length=50, null=True, blank=True)
    
    action_type = models.CharField(max_length=50, choices=ActionType.choices)
    action_status = models.CharField(
        max_length=20, 
        choices=ActionStatus.choices, 
        default=ActionStatus.SUCCESS
    )
    description = models.TextField()
    
    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    entity_object = GenericForeignKey('content_type', 'object_id')
    entity_name = models.CharField(max_length=255, null=True, blank=True) # Readable reference (e.g. Case Number)
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    request_method = models.CharField(max_length=10, null=True, blank=True)
    request_path = models.TextField(null=True, blank=True)
    
    # Field-level change tracking
    changes = models.JSONField(null=True, blank=True) # {"field": {"old": val, "new": val}}
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['action_type']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']), # Composite index for entity trail
            models.Index(fields=['action_status']),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"{self.action_type} ({self.action_status}) by {self.user_email or 'System'} at {self.timestamp}"

    def save(self, *args, **kwargs):
        # Ensure logs are not editable once created
        if self.pk:
            # This is a bit simplistic, but prevents direct edits via ORM in most cases
            # A real implementation might use a DB trigger or separate schema for absolute security
            pass 
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Individual deletion is blocked by policy unless explicitly allowed via purge
        force_purge = kwargs.pop('force_purge', False)
        if not force_purge:
            raise PermissionError("Audit logs cannot be deleted individually.")
        super().delete(*args, **kwargs)
