from rest_framework import serializers
from django.utils import timezone
from .models import Hearing, HearingParticipant, HearingReminder
from cases.models import Case
from accounts.serializers import UserProfileSerializer


class HearingParticipantSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = HearingParticipant
        fields = [
            'id', 'user', 'role_in_hearing', 'attendance_status',
            'invited_at', 'responded_at'
        ]
        read_only_fields = ['id', 'invited_at', 'responded_at']

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "full_name": obj.user.get_full_name(),
            "email": obj.user.email
        }


class HearingSerializer(serializers.ModelSerializer):
    case_details = serializers.SerializerMethodField()
    participants = HearingParticipantSerializer(source='participant_list', many=True, read_only=True)
    
    class Meta:
        model = Hearing
        fields = [
            'id', 'case', 'case_details', 
            'title', 'hearing_type', 'status',
            'scheduled_date', 'location', 'virtual_meeting_link',
            'agenda', 'participants', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']
    
    def get_case_details(self, obj):
        return {
            "id": obj.case.id,
            "title": obj.case.title,
            "file_number": obj.case.file_number
        }
    
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
            'case', 'judge' ,'title', 'hearing_type', 'scheduled_date',
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
        request = self.context.get('request')
        if not request or not request.user:
             raise serializers.ValidationError("Authentication required.")

        # Allow ADMIN, CLERK, and REGISTRAR to schedule for any active case
        if request.user.role in ['ADMIN', 'CLERK', 'REGISTRAR']:
            return data

        # For JUDGE role, perform additional checks
        if request.user.role == 'JUDGE':
            # Check if judge is assigned to this case
            is_assigned = case.judge_assignments.filter(
                judge=request.user,
                is_active=True
            ).exists()
            
            if not is_assigned:
                raise serializers.ValidationError("You are not assigned to this case.")
        else:
            raise serializers.ValidationError("You do not have permission to schedule hearings.")
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        # If judge is not provided in data, use the current user (if they are a judge)
        if 'judge' not in validated_data:
            if request.user.role == 'JUDGE':
                validated_data['judge'] = request.user
            else:
                raise serializers.ValidationError({"judge": "This field is required for your role."})
        
        # Create the hearing
        hearing = Hearing.objects.create(**validated_data)
        
        # Create participants based on case parties
        self._create_participants(hearing)
        
        return hearing
    
    def _create_participants(self, hearing):
        """Create participants for the hearing based on case parties"""
        case = hearing.case
        
        # Add plaintiff
        if case.plaintiff:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.plaintiff,
                role_in_hearing='Plaintiff'
            )
        
        # Add defendant
        if case.defendant:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.defendant,
                role_in_hearing='Defendant'
            )
        
        # Add plaintiff lawyer
        if case.plaintiff_lawyer:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.plaintiff_lawyer,
                role_in_hearing="Plaintiff's Lawyer"
            )
        
        # Add defendant lawyer
        if case.defendant_lawyer:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.defendant_lawyer,
                role_in_hearing="Defendant's Lawyer"
            )
        
        # Add the judge as a participant
        HearingParticipant.objects.create(
            hearing=hearing,
            user=hearing.judge,
            role_in_hearing='Presiding Judge',
            attendance_status='CONFIRMED'
        )
        
         # Add case creator if not already added and not the same as plaintiff/defendant
        if case.created_by and case.created_by not in [
            case.plaintiff, case.defendant, case.plaintiff_lawyer, 
            case.defendant_lawyer, hearing.judge
        ]:
            HearingParticipant.objects.create(
                hearing=hearing,
                user=case.created_by,
                role_in_hearing='Case Filer'
            )
        
        return hearing


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