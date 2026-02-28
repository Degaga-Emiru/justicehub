import uuid
from django.db import models
from django.conf import settings

class UserActionLog(models.Model):
    """Audit log for user actions"""
    
    class ActionType(models.TextChoices):
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'
        STATUS_CHANGE = 'STATUS_CHANGE', 'Status Change'
        ASSIGN = 'ASSIGN', 'Assign'
        DECISION = 'DECISION', 'Decision'
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='audit_logs'
    )
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    model_name = models.CharField(max_length=100)
    object_id = models.UUIDField(null=True, blank=True)
    object_repr = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action_type']),
        ]
        verbose_name = 'User Action Log'
        verbose_name_plural = 'User Action Logs'

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else "System"
        return f"{self.action_type} - {self.model_name} ({self.object_repr}) by {user_str}"
