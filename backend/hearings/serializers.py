from rest_framework import serializers
from django.utils import timezone
from .models import Hearing, HearingParticipant, HearingReminder
from cases.models import Case
from accounts.serializers import UserProfileSerializer


class HearingParticipantSerializer(serializers.ModelSerializer):
    user_details = UserProfileSerializer(source='user', read_only=True)
    
    class Meta:
        model = HearingParticipant
        fields = [
            'id', 'user', 'user_details', 'role_in_hearing',
            'attendance_status', 'notes', 'invited_at', 'responded_at'
        ]
        read_only_fields = ['id', 'invited_at', 'responded_at']


class HearingSerializer(serializers.ModelSerializer):
    case_details = serializers.SerializerMethodField()
    judge_details = UserProfileSerializer(source='judge', read_only=True)
    participants = HearingParticipantSerializer(source='participant_list', many=True, read_only=True)
    
    class Meta:
        model = Hearing
        fields = [
            'id', 'case', 'case_details', 'judge', 'judge_details',
            'title', 'hearing_type', 'status',
            'scheduled_date', 'duration_minutes', 'location', 'virtual_meeting_link',
            'agenda', 'notes', 'is_public',
            'recording_url', 'transcript_url',
            'participants', 'created_at', 'updated_at', 'completed_at', 'cancelled_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'completed_at', 'cancelled_at']
    
    def get_case_details(self, obj):
        from cases.serializers import CaseListSerializer
        return CaseListSerializer(obj.case).data
    
    def validate_scheduled_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value
    
    def validate(self, data):
        # Check for conflicts
        if data.get('location'):
            conflicting = Hearing.objects.filter(
                location=data['location'],
                scheduled_date__date=data['scheduled_date'].date(),
                status__in=['SCHEDULED', 'CONFIRMED']
            ).exclude(pk=self.instance.pk if self.instance else None)
            
            if conflicting.exists():
                raise serializers.ValidationError(
                    "Courtroom already booked for this time."
                )
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['judge'] = request.user
        
        hearing = super().create(validated_data)
        
        # Add judge as participant
        HearingParticipant.objects.create(
            hearing=hearing,
            user=request.user,
            role_in_hearing='Presiding Judge',
            attendance_status='CONFIRMED'
        )
        
        # Add case parties as participants
        case = hearing.case
        
        # Plaintiff
        if case.plaintiff:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.plaintiff,
                role_in_hearing='Plaintiff'
            )
        
        # Defendant
        if case.defendant:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.defendant,
                role_in_hearing='Defendant'
            )
        
        # Lawyers
        if case.plaintiff_lawyer:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.plaintiff_lawyer,
                role_in_hearing="Plaintiff's Lawyer"
            )
        
        if case.defendant_lawyer:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.defendant_lawyer,
                role_in_hearing="Defendant's Lawyer"
            )
        
        return hearing


class HearingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hearing
        fields = [
            'case', 'title', 'hearing_type', 'scheduled_date',
            'duration_minutes', 'location', 'virtual_meeting_link',
            'agenda', 'notes', 'is_public'
        ]
    
    def validate(self, data):
        case = data.get('case')
        
        # Check if case is active
        if case.status not in ['ASSIGNED', 'IN_PROGRESS']:
            raise serializers.ValidationError(
                "Hearings can only be scheduled for active cases."
            )
        
        return data


class HearingConfirmAttendanceSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['CONFIRMED', 'DECLINE'])
    notes = serializers.CharField(required=False, allow_blank=True)


class HearingRescheduleSerializer(serializers.Serializer):
    scheduled_date = serializers.DateTimeField()
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_scheduled_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value


class HearingReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = HearingReminder
        fields = ['id', 'reminder_type', 'scheduled_for', 'is_sent', 'sent_at']
        read_only_fields = ['id', 'is_sent', 'sent_at']


class HearingCalendarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    start = serializers.DateTimeField(source='scheduled_date')
    end = serializers.SerializerMethodField()
    location = serializers.CharField()
    status = serializers.CharField()
    case_number = serializers.CharField(source='case.file_number')
    
    def get_end(self, obj):
        return obj.scheduled_date + timezone.timedelta(minutes=obj.duration_minutes)


class BulkScheduleHearingSerializer(serializers.Serializer):
    case_ids = serializers.ListField(child=serializers.UUIDField())
    hearing_data = HearingCreateSerializer()
    
    def validate_case_ids(self, value):
        cases = Case.objects.filter(id__in=value)
        if len(cases) != len(value):
            raise serializers.ValidationError("One or more cases not found.")
        return value