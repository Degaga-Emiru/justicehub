from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
from .models import Hearing, HearingParticipant, HearingReminder
from cases.models import Case
from accounts.serializers import UserProfileSerializer


class AttendanceUpdateItemSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    role = serializers.CharField()
    attendance_status = serializers.ChoiceField(choices=['present', 'absent', 'late', 'PRESENT', 'ABSENT', 'LATE'])


class HearingParticipantSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = HearingParticipant
        fields = [
            'id', 'user', 'role_in_hearing', 'confirmation_status',
            'decline_reason', 'attendance_status',
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
            'title', 'hearing_type', 'hearing_format', 'status',
            'scheduled_date', 'duration_minutes', 'location', 'virtual_meeting_link',
            'agenda', 'notes', 'cancellation_reason', 'is_public',
            'participants', 'created_at', 'completed_at', 'cancelled_at'
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
    hearing_date = serializers.DateField(write_only=True, required=False)
    start_time = serializers.TimeField(write_only=True, required=False)
    end_time = serializers.TimeField(write_only=True, required=False)
    participants = AttendanceUpdateItemSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Hearing
        fields = [
            'case', 'judge', 'title', 'hearing_type', 'hearing_format', 'scheduled_date',
            'hearing_date', 'start_time', 'end_time',
            'duration_minutes', 'location', 'virtual_meeting_link',
            'agenda', 'notes', 'is_public', 'participants'
        ]
        extra_kwargs = {
            'scheduled_date': {'required': False},
            'duration_minutes': {'required': False}
        }
    
    def validate(self, data):
        from core.utils.scheduling import check_time_overlap, is_within_working_hours
        from cases.constants import CaseStatus as CaseStatusConst
        import datetime
        
        # Handle explicit date/time fields if provided
        hearing_date = data.get('hearing_date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if hearing_date and start_time:
            naive_dt = datetime.datetime.combine(hearing_date, start_time)
            data['scheduled_date'] = timezone.make_aware(naive_dt, timezone.get_current_timezone())
            
            if end_time:
                # Calculate duration from end_time
                start_dt = datetime.datetime.combine(hearing_date, start_time)
                end_dt = datetime.datetime.combine(hearing_date, end_time)
                if end_dt <= start_dt:
                    raise serializers.ValidationError("End time must be after start time.")
                
                diff = end_dt - start_dt
                data['duration_minutes'] = int(diff.total_seconds() / 60)
        
        # If this is an update, use existing values if not provided
        is_update = self.instance is not None
        
        if not data.get('scheduled_date') and not is_update:
            raise serializers.ValidationError({"scheduled_date": "This field or hearing_date + start_time is required."})

        case = data.get('case') if 'case' in data else (self.instance.case if is_update else None)
        scheduled_date = data.get('scheduled_date') if 'scheduled_date' in data else (self.instance.scheduled_date if is_update else None)
        duration = data.get('duration_minutes', self.instance.duration_minutes if is_update else 60)
        location = data.get('location') if 'location' in data else (self.instance.location if is_update else None)
        judge = data.get('judge') if 'judge' in data else (self.instance.judge if is_update else None)
        
        # Only validate case status on creation
        if not is_update and case:
            allowed_statuses = [CaseStatusConst.PAID, CaseStatusConst.ASSIGNED, CaseStatusConst.IN_PROGRESS]
            if case.status not in allowed_statuses:
                 raise serializers.ValidationError(
                    f"Hearings can only be scheduled for cases with status: {', '.join(allowed_statuses)}. "
                    f"Current status: {case.status}"
                )

        # 13: Working Hours Constraint
        if scheduled_date:
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
                
                if is_update:
                    judge_conflicts = judge_conflicts.exclude(pk=self.instance.pk)
                
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
                
                if is_update:
                    room_conflicts = room_conflicts.exclude(pk=self.instance.pk)
                
                for h in room_conflicts:
                    h_end = h.scheduled_date + timezone.timedelta(minutes=h.duration_minutes)
                    if check_time_overlap(scheduled_date, end_date, h.scheduled_date, h_end):
                        raise serializers.ValidationError(f"Courtroom '{location}' is already booked for another hearing.")

            # 3.4 & 3.5: Defendant/Plaintiff Overlap
            if case:
                parties = [case.plaintiff, case.defendant]
                for party in filter(None, parties):
                     party_conflicts = Hearing.objects.filter(
                        Q(case__plaintiff=party) | Q(case__defendant=party),
                        scheduled_date__date=scheduled_date.date()
                    ).exclude(status='CANCELLED')
                     
                     if is_update:
                         party_conflicts = party_conflicts.exclude(pk=self.instance.pk)
                     
                     for h in party_conflicts:
                         h_end = h.scheduled_date + timezone.timedelta(minutes=h.duration_minutes)
                         if check_time_overlap(scheduled_date, end_date, h.scheduled_date, h_end):
                             raise serializers.ValidationError(f"Party {party.get_full_name()} has another hearing conflict at this time.")

        # 8: Role-based Constraint (Judge cannot be party)
        if judge and case and (judge == case.plaintiff or judge == case.defendant):
            raise serializers.ValidationError("Judge cannot preside over a case where they are a party.")

        # Permission checks
        request = self.context.get('request')
        if not request or not request.user:
             raise serializers.ValidationError("Authentication required.")

        if request.user.role in ['ADMIN', 'CLERK', 'REGISTRAR']:
            return data

        if request.user.role == 'JUDGE' and case:
            is_assigned = case.judge_assignments.filter(
                judge=request.user,
                is_active=True
            ).exists()
            if not is_assigned:
                raise serializers.ValidationError("You are not assigned to this case.")
        elif request.user.role != 'JUDGE':
            raise serializers.ValidationError("You do not have permission to schedule hearings.")
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        manual_participants = validated_data.pop('participants', [])
        
        # Clean up write-only fields not in model
        validated_data.pop('hearing_date', None)
        validated_data.pop('start_time', None)
        validated_data.pop('end_time', None)
        
        # If judge is not provided in data, use the current user (if they are a judge)
        if 'judge' not in validated_data:
            if request.user.role == 'JUDGE':
                validated_data['judge'] = request.user
            else:
                raise serializers.ValidationError({"judge": "This field is required for your role."})
        
        # Create the hearing
        hearing = Hearing.objects.create(**validated_data)
        
        # Create participants (base parties + manual list)
        self._create_participants(hearing, manual_participants)
        
        return hearing
    
    def _create_participants(self, hearing, manual_participants):
        """Create participants for the hearing based on case parties and manual input"""
        case = hearing.case
        created_user_ids = set()

        def add_participant(user, role, status='PENDING'):
            if user and user.id not in created_user_ids:
                HearingParticipant.objects.create(
                    hearing=hearing,
                    user=user,
                    role_in_hearing=role,
                    attendance_status=status.upper() if status else 'PENDING'
                )
                created_user_ids.add(user.id)

        # 1. Add manual participants first (explicit preference)
        for p_data in manual_participants:
            add_participant(p_data['user_id'], p_data['role'], status=p_data.get('attendance_status'))

        # 2. Add standard case parties if not already added
        if case.plaintiff:
            add_participant(case.plaintiff, 'Plaintiff')
        
        if case.defendant:
            add_participant(case.defendant, 'Defendant')
        
        if case.plaintiff_lawyer:
            add_participant(case.plaintiff_lawyer, "Plaintiff's Lawyer")
        
        if case.defendant_lawyer:
            add_participant(case.defendant_lawyer, "Defendant's Lawyer")
        
        # 3. Add the judge
        add_participant(hearing.judge, 'Presiding Judge', status='CONFIRMED')
        
        # 4. Add case creator
        if case.created_by:
            add_participant(case.created_by, 'Case Filer')
        
        return hearing

class HearingUpdateSerializer(HearingCreateSerializer):
    """Serializer explicitly used for Updates where all fields are optional"""
    class Meta(HearingCreateSerializer.Meta):
        pass
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].required = False


class HearingConfirmAttendanceSerializer(serializers.Serializer):
    participant_role = serializers.CharField()


class HearingDeclineAttendanceSerializer(serializers.Serializer):
    participant_role = serializers.CharField()
    reason = serializers.CharField()




class RecordAttendanceSerializer(serializers.Serializer):
    participants = AttendanceUpdateItemSerializer(many=True)


class HearingRescheduleSerializer(serializers.Serializer):
    new_date = serializers.DateField()
    new_time = serializers.TimeField()
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        import datetime
        
        naive_dt = datetime.datetime.combine(attrs['new_date'], attrs['new_time'])
        aware_dt = timezone.make_aware(naive_dt, timezone.get_current_timezone())
        if aware_dt <= timezone.now():
            raise serializers.ValidationError("Scheduled date must be in the future.")
            
        attrs['scheduled_date'] = aware_dt
        return attrs


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