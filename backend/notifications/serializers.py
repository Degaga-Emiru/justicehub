from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'priority', 'title', 'message',
            'action_url', 'icon', 'metadata', 'is_read',
            'created_at', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class NotificationMarkReadSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )
    mark_all = serializers.BooleanField(default=False)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'email_notifications', 'push_notifications', 'sms_notifications',
            'case_updates', 'hearing_updates', 'decision_updates',
            'document_updates', 'system_alerts',
            'quiet_hours_start', 'quiet_hours_end', 'timezone'
        ]
    
    def validate(self, data):
        if data.get('quiet_hours_start') and data.get('quiet_hours_end'):
            if data['quiet_hours_start'] >= data['quiet_hours_end']:
                raise serializers.ValidationError(
                    "Quiet hours end time must be after start time."
                )
            
        return data