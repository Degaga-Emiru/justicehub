from rest_framework import serializers
from .models import Notification, NotificationPreference
from cases.models import Case

class CaseNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['id', 'title', 'file_number']

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    case = CaseNotificationSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'priority', 'title', 'message',
            'is_read', 'time_ago', 'case', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return f"{timesince(obj.created_at).split(',')[0]} ago"


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


# ✅ OUTSIDE the previous class
class NotificationStatisticsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    read_percentage = serializers.FloatField()
    by_type = serializers.ListField()
    by_priority = serializers.ListField()
    