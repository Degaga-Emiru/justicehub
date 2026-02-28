from rest_framework import serializers
from .models import UserActionLog

class UserActionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)

    class Meta:
        model = UserActionLog
        fields = [
            'id', 'user', 'user_name', 'action_type', 'action_type_display',
            'model_name', 'object_id', 'object_repr', 'description',
            'old_data', 'new_data', 'ip_address', 'user_agent', 'timestamp'
        ]
        read_only_fields = fields
