from rest_framework import serializers
from django.db.models import Q
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
        from core.utils.scheduling import check_time_overlap, is_within_working_hours
        from cases.constants import CaseStatus as CaseStatusConst
        
        case = data.get('case')
        scheduled_date = data.get('scheduled_date')
        duration = data.get('duration_minutes', 60)
        location = data.get('location')
        judge = data.get('judge')
        
        # 2.2: Case status check (Must be PAID or later)
        # Allowed status for hearing: PAID, ASSIGNED, IN_PROGRESS
        allowed_statuses = [CaseStatusConst.PAID, CaseStatusConst.ASSIGNED, CaseStatusConst.IN_PROGRESS]
        if case.status not in allowed_statuses:
             raise serializers.ValidationError(
                f"Hearings can only be scheduled for cases with status: {', '.join(allowed_statuses)}. "
                f"Current status: {case.status}"
            )

        # 13: Working Hours Constraint
        is_val, msg = is_within_working_hours(scheduled_date, duration)
        if not is_val:
            raise serializers.ValidationError(msg)

        # Time conflict validation logic
        end_date = scheduled_date + timezone.timedelta(minutes=duration)
        
        # 3.1: Judge Overlap
        if judge:
            judge_conflicts = Hearing.objects.filter(
                judge=judge,
                scheduled_date__date=scheduled_date.date()
            ).exclude(status='CANCELLED')
            
            for h in judge_conflicts:
                h_end = h.scheduled_date + timezone.timedelta(minutes=h.duration_minutes)
                if check_time_overlap(scheduled_date, end_date, h.scheduled_date, h_end):
                    raise serializers.ValidationError(f"Judge is already booked for another hearing at this time.")

        # 3.2: Room Overlap
        if location:
            room_conflicts = Hearing.objects.filter(
                location=location,
                scheduled_date__date=scheduled_date.date()
            ).exclude(status='CANCELLED')
            
            for h in room_conflicts:
                h_end = h.scheduled_date + timezone.timedelta(minutes=h.duration_minutes)
                if check_time_overlap(scheduled_date, end_date, h.scheduled_date, h_end):
                    raise serializers.ValidationError(f"Courtroom '{location}' is already booked for another hearing.")

        # 3.4 & 3.5: Defendant/Plaintiff Overlap
        parties = [case.plaintiff, case.defendant]
        for party in filter(None, parties):
             party_conflicts = Hearing.objects.filter(
                Q(case__plaintiff=party) | Q(case__defendant=party),
                scheduled_date__date=scheduled_date.date()
            ).exclude(status='CANCELLED')
             
             for h in party_conflicts:
                 h_end = h.scheduled_date + timezone.timedelta(minutes=h.duration_minutes)
                 if check_time_overlap(scheduled_date, end_date, h.scheduled_date, h_end):
                     raise serializers.ValidationError(f"Party {party.get_full_name()} has another hearing conflict at this time.")

        # 8: Role-based Constraint (Judge cannot be party)
        if judge and (judge == case.plaintiff or judge == case.defendant):
            raise serializers.ValidationError("Judge cannot preside over a case where they are a party.")

        # Permission checks
        request = self.context.get('request')
        if not request or not request.user:
             raise serializers.ValidationError("Authentication required.")

        if request.user.role in ['ADMIN', 'CLERK', 'REGISTRAR']:
            return data

        if request.user.role == 'JUDGE':
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