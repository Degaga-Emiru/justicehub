from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    action_status_display = serializers.CharField(source='get_action_status_display', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_role',
            'action_type', 'action_type_display', 'action_status', 'action_status_display',
            'description', 'content_type', 'content_type_name', 'object_id', 'entity_name',
            'ip_address', 'user_agent', 'request_method', 'request_path',
            'changes', 'is_suspicious', 'timestamp'
        ]
        read_only_fields = fields

class AuditLogSummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    total_actions = serializers.IntegerField()
    unique_users = serializers.IntegerField()
    action_counts = serializers.DictField()
    role_counts = serializers.DictField()
    peak_hour = serializers.IntegerField()
