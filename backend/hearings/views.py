from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from datetime import timedelta
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog

from .models import Hearing, HearingParticipant, HearingReminder
from .serializers import (
    HearingSerializer, HearingCreateSerializer, HearingParticipantSerializer,
    HearingConfirmAttendanceSerializer, HearingRescheduleSerializer,
    HearingReminderSerializer, HearingCalendarSerializer,
    BulkScheduleHearingSerializer, HearingCompleteSerializer
)
from .permissions import (
    IsHearingJudge, IsHearingParticipant, CanScheduleHearings,
    CanConfirmAttendance, CanViewHearing
)
from notifications.services import create_notification, notify_case_participants
from cases.models import Case, JudgeAssignment
from core.exceptions import BusinessLogicError
from accounts.permissions import IsJudge
import logging

logger = logging.getLogger(__name__)


class HearingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing hearings.
    """
    queryset = Hearing.objects.all().select_related(
        'case', 'judge'
    ).prefetch_related('participant_list__user')
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return HearingCreateSerializer
        if self.action in ['update', 'partial_update']:
            from .serializers import HearingUpdateSerializer
            return HearingUpdateSerializer
        return HearingSerializer
    
    def get_queryset(self):
        user = self.request.user
        logger.debug(f"HearingViewSet.get_queryset: user={user}, role={getattr(user, 'role', 'N/A')}")
        
        if not user or not user.is_authenticated:
            logger.debug("User not authenticated, returning empty queryset")
            return self.queryset.none()

        if user.role == 'ADMIN':
            logger.debug("Role is ADMIN, returning full queryset")
            return self.queryset
        elif user.role in ['JUDGE', 'CLERK', 'REGISTRAR']:
            logger.debug(f"Role is {user.role}, filtering by judge/assignment")
            qs = self.queryset.filter(
                Q(judge=user) |
                Q(case__judge_assignments__judge=user, case__judge_assignments__is_active=True)
            ).distinct()
            logger.debug(f"Staff queryset count: {qs.count()}")
            return qs
        else:
            logger.debug(f"Role is {user.role}, filtering by participant/case roles")
            # For clients/lawyers, show hearings for their cases
            qs = self.queryset.filter(
                Q(case__created_by=user) |
                Q(case__plaintiff=user) |
                Q(case__defendant=user) |
                Q(case__plaintiff_lawyer=user) |
                Q(case__defendant_lawyer=user) |
                Q(participant_list__user=user)
            ).distinct()
            logger.debug(f"Citizen/Lawyer queryset count: {qs.count()}")
            return qs
    
    def get_permissions(self):
        if self.action in ['create']:
            self.permission_classes = [IsAuthenticated, CanScheduleHearings]
        elif self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsHearingJudge]
        elif self.action in ['retrieve']:
            self.permission_classes = [IsAuthenticated, CanViewHearing]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        hearing = serializer.save()
        
        # Schedule reminders
        self._schedule_reminders(hearing)
         # Get participants to notify
        participants = hearing.participant_list.exclude(user=hearing.judge)

        # Notify participants
        notify_case_participants(
            case=hearing.case,
            type='HEARING_SCHEDULED',
            title='Hearing Scheduled',
            message=f'A hearing has been scheduled for {hearing.scheduled_date.strftime("%B %d, %Y at %I:%M %p")}',
            exclude_users=[self.request.user]
        )
        
        logger.info(f"Hearing {hearing.id} scheduled for case {hearing.case.id}")
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanConfirmAttendance])
    def confirm_attendance(self, request, pk=None):
        """Confirm attendance for hearing"""
        logger.debug(f"confirm_attendance called for pk={pk}, user={request.user}")
        try:
            hearing = self.get_object()
        except Exception as e:
            logger.error(f"get_object failed in confirm_attendance: {e}")
            raise e
            
        serializer = HearingConfirmAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data.get('participant_role')
        
        logger.debug(f"Filtering participant: hearing={hearing}, user={request.user}, role={role}")
        query = HearingParticipant.objects.filter(hearing=hearing, user=request.user)
        if role:
            query = query.filter(role_in_hearing__iexact=role)
        
        participant = get_object_or_404(query)
        logger.debug(f"Found participant: {participant}")
        
        participant.confirmation_status = 'CONFIRMED'
        participant.responded_at = timezone.now()
        participant.save()
        
        # Notify judge
        create_notification(
            user=hearing.judge,
            type='HEARING_RESPONSE',
            title='Attendance Response Received',
            message=f'{request.user.get_full_name()} has confirmed their attendance',
            case=hearing.case
        )
        
        # Log Attendance
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.HEARING_ATTENDANCE,
            obj=hearing,
            description=f"{request.user.get_full_name()} confirmed attendance",
            entity_name=hearing.case.file_number
        )
        
        return Response({
            "message": "Attendance confirmed successfully.",
            "hearing_id": hearing.id,
            "participant": participant.role_in_hearing.lower(),
            "confirmation_status": "confirmed"
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanConfirmAttendance])
    def decline_attendance(self, request, pk=None):
        """Decline attendance for hearing"""
        hearing = self.get_object()
        from .serializers import HearingDeclineAttendanceSerializer
        serializer = HearingDeclineAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data.get('participant_role')
        reason = serializer.validated_data.get('reason')
        
        query = HearingParticipant.objects.filter(hearing=hearing, user=request.user)
        if role:
            query = query.filter(role_in_hearing__iexact=role)
        participant = get_object_or_404(query)
        
        participant.confirmation_status = 'DECLINED'
        participant.decline_reason = reason
        participant.responded_at = timezone.now()
        participant.save()
        
        return Response({
            "message": "Attendance declined successfully.",
            "hearing_id": hearing.id,
            "participant": participant.role_in_hearing.lower(),
            "confirmation_status": "declined",
            "reason": reason
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def cancel(self, request, pk=None):
        """Cancel hearing"""
        hearing = self.get_object()
        
        # Relaxed check: Only prevent cancellation if already COMPLETED or CANCELLED
        if hearing.status in ['COMPLETED', 'CANCELLED']:
            raise BusinessLogicError(f"Cannot cancel a hearing with status {hearing.status}")
        
        hearing.status = 'CANCELLED'
        hearing.cancelled_at = timezone.now()
        hearing.cancellation_reason = request.data.get('reason', '')
        hearing.save()
        
        # Notify participants
        notify_case_participants(
            case=hearing.case,
            type='HEARING_CANCELLED',
            title='Hearing Cancelled',
            message=f'The hearing scheduled for {hearing.scheduled_date.strftime("%B %d, %Y at %I:%M %p")} has been cancelled',
            exclude_users=[request.user]
        )
        
        # Log Cancellation
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.HEARING_CANCELLED,
            obj=hearing,
            description=f"Hearing for case {hearing.case.file_number} has been cancelled",
            entity_name=hearing.case.file_number
        )

        return Response({
            "message": "Hearing cancelled successfully",
            "status": "CANCELLED"
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def complete(self, request, pk=None):
        """Mark hearing as completed with structured notes and optional next hearing"""
        hearing = self.get_object()
        
        if hearing.status == 'CONDUCTED':
            raise BusinessLogicError("This hearing has already been conducted.")
            
        serializer = HearingCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Update current hearing
        hearing.status = 'CONDUCTED'
        hearing.conducted_at = timezone.now()
        hearing.recording_url = data.get('recording_url')
        hearing.transcript_url = data.get('transcript_url')
        hearing.minutes = data.get('minutes')
        hearing.notes = data.get('notes')
        hearing.save()
        
        # Handle next hearing creation if date is provided
        next_hearing_created = False
        next_date = data.get('next_hearing_date')
        if next_date:
            # Create new hearing
            new_hearing = Hearing.objects.create(
                case=hearing.case,
                judge=hearing.judge,
                title=f"Follow-up: {hearing.title}",
                hearing_type=hearing.hearing_type, # Default to same type, or could be INITIAL/STATUS
                scheduled_date=next_date,
                duration_minutes=hearing.duration_minutes,
                location=hearing.location,
                hearing_format=hearing.hearing_format,
                agenda=f"Follow-up from hearing on {hearing.conducted_at.strftime('%Y-%m-%d')}",
                status='SCHEDULED'
            )
            
            # Copy participants
            for participant in hearing.participant_list.all():
                HearingParticipant.objects.create(
                    hearing=new_hearing,
                    user=participant.user,
                    role_in_hearing=participant.role_in_hearing
                )
            
            # Schedule reminders for new hearing
            self._schedule_reminders(new_hearing)
            next_hearing_created = True

        # Log Completion
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.HEARING_COMPLETED,
            obj=hearing,
            description=f"Hearing for case {hearing.case.file_number} conducted. Action: {data['notes']['action']}",
            entity_name=hearing.case.file_number
        )

        return Response({
            "message": "Hearing completed successfully",
            "hearing_status": "CONDUCTED",
            "next_hearing_created": next_hearing_created
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def reschedule(self, request, pk=None):
        """Reschedule hearing"""
        hearing = self.get_object()
        
        serializer = HearingRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_date = hearing.scheduled_date
        hearing.status = 'RESCHEDULED'
        hearing.save()
        
        # Create new hearing with updated date
        new_hearing = Hearing.objects.create(
            case=hearing.case,
            judge=hearing.judge,
            title=hearing.title,
            hearing_type=hearing.hearing_type,
            scheduled_date=serializer.validated_data['scheduled_date'],
            duration_minutes=hearing.duration_minutes,
            location=hearing.location,
            virtual_meeting_link=hearing.virtual_meeting_link,
            agenda=hearing.agenda,
            notes=f"Rescheduled from {old_date.strftime('%B %d, %Y')}. Reason: {serializer.validated_data.get('reason', 'Not specified')}"
        )
        
        # Copy participants
        for participant in hearing.participant_list.all():
            HearingParticipant.objects.create(
                hearing=new_hearing,
                user=participant.user,
                role_in_hearing=participant.role_in_hearing
            )
        
        # Notify participants
        notify_case_participants(
            case=hearing.case,
            type='HEARING_RESCHEDULED',
            title='Hearing Rescheduled',
            message=f'The hearing has been rescheduled to {new_hearing.scheduled_date.strftime("%B %d, %Y at %I:%M %p")}',
            exclude_users=[request.user]
        )
        
        response_data = HearingSerializer(new_hearing).data
        return Response({
            "message": f"Hearing successfully rescheduled from {old_date.strftime('%B %d, %Y')}.",
            "status": "RESCHEDULED",
            "hearing": response_data
        }, status=status.HTTP_201_CREATED)
    
    def create(self, request, *args, **kwargs):
        """Override create to return the rich HearingSerializer data"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        hearing = serializer.instance
        
        # Log Hearing Scheduled
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.HEARING_SCHEDULED,
            obj=hearing,
            description=f"Hearing scheduled for case {hearing.case.file_number} at {hearing.scheduled_date}",
            entity_name=hearing.case.file_number
        )
        
        # Use HearingSerializer for the response
        response_serializer = HearingSerializer(serializer.instance, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Get hearing participants"""
        hearing = self.get_object()
        participants = hearing.participant_list.all()
        serializer = HearingParticipantSerializer(participants, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def record_attendance(self, request, pk=None):
        """Record attendance for hearing"""
        hearing = self.get_object()
        from .serializers import RecordAttendanceSerializer
        serializer = RecordAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        for p_data in serializer.validated_data['participants']:
            try:
                participant = HearingParticipant.objects.get(
                    hearing=hearing, 
                    user_id=p_data['user_id'],
                    role_in_hearing__iexact=p_data['role']
                )
                participant.attendance_status = p_data['attendance_status'].upper()
                participant.save()
            except HearingParticipant.DoesNotExist:
                pass
                
        return Response({
            "message": "Hearing attendance recorded successfully",
            "hearing_id": hearing.id
        })
        
    @action(detail=True, methods=['patch'], url_path='attendance/(?P<user_id>[^/.]+)', permission_classes=[IsAuthenticated, IsHearingJudge])
    def single_attendance(self, request, pk=None, user_id=None):
        """Update single participant attendance"""
        hearing = self.get_object()
        participant = get_object_or_404(HearingParticipant, hearing=hearing, user_id=user_id)
        status_val = request.data.get('attendance_status', '').upper()
        if status_val in ['PRESENT', 'ABSENT', 'LATE']:
            participant.attendance_status = status_val
            participant.save()
            return Response({"message": "Attendance updated"})
        return Response({"error": "Invalid status - present/absent/late only"}, status=400)

    @action(detail=True, methods=['get'])
    def attendance(self, request, pk=None):
        """Get hearing attendance cleanly"""
        hearing = self.get_object()
        participants = hearing.participant_list.all()
        data = []
        for p in participants:
            data.append({
                "name": p.user.get_full_name(),
                "role": p.role_in_hearing,
                "confirmation_status": p.confirmation_status.lower(),
                "attendance_status": p.attendance_status.lower()
            })
        return Response({
            "hearing_id": hearing.id,
            "participants": data
        })

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def status(self, request, pk=None):
        """Update hearing status"""
        hearing = self.get_object()
        new_status = request.data.get('status', '').upper()
        if new_status in dict(Hearing.HearingStatus.choices):
            hearing.status = new_status
            hearing.save()
            return Response({"message": f"Status updated to {new_status}"})
        return Response({"error": "Invalid status"}, status=400)
    
    @action(detail=True, methods=['get'])
    def reminders(self, request, pk=None):
        """Get hearing reminders"""
        hearing = self.get_object()
        reminders = hearing.reminders.all()
        serializer = HearingReminderSerializer(reminders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming hearings"""
        user = request.user
        
        hearings = self.get_queryset().filter(
            scheduled_date__gte=timezone.now(),
            status__in=['SCHEDULED', 'CONFIRMED']
        ).order_by('scheduled_date')[:10]
        
        serializer = self.get_serializer(hearings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Get hearings in calendar format"""
        user = request.user
        
        start_date = request.query_params.get('start')
        end_date = request.query_params.get('end')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start and end dates required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hearings = self.get_queryset().filter(
            scheduled_date__date__gte=start_date,
            scheduled_date__date__lte=end_date
        )
        
        serializer = HearingCalendarSerializer(hearings, many=True)
        return Response(serializer.data)
    
    def _schedule_reminders(self, hearing):
        """Schedule reminders for hearing"""
        # 24-hour reminder
        HearingReminder.objects.create(
            hearing=hearing,
            user=hearing.judge,
            reminder_type='EMAIL',
            scheduled_for=hearing.scheduled_date - timedelta(hours=24)
        )
        
        # 1-hour reminder for all participants
        participants = [p.user for p in hearing.participant_list.all()]
        for user in participants:
            HearingReminder.objects.create(
                hearing=hearing,
                user=user,
                reminder_type='EMAIL',
                scheduled_for=hearing.scheduled_date - timedelta(hours=1)
            )



class JudgeCalendarView(generics.ListAPIView):
    """View for judge's hearing calendar"""
    serializer_class = HearingCalendarSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        judge_id = self.kwargs['judge_id']
        
        start_date = self.request.query_params.get('start')
        end_date = self.request.query_params.get('end')
        
        queryset = Hearing.objects.filter(
            judge_id=judge_id,
            scheduled_date__date__gte=start_date,
            scheduled_date__date__lte=end_date
        ).order_by('scheduled_date')
        
        return queryset


class CourtroomAvailabilityView(generics.GenericAPIView):
    """View for checking courtroom availability"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, courtroom):
        date = request.query_params.get('date')
        if not date:
            return Response(
                {"error": "Date required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all hearings in this courtroom on this date
        hearings = Hearing.objects.filter(
            location__icontains=courtroom,
            scheduled_date__date=date,
            status__in=['SCHEDULED', 'CONFIRMED']
        ).order_by('scheduled_date')
        
        slots = []
        for hearing in hearings:
            end_time = hearing.scheduled_date + timedelta(minutes=hearing.duration_minutes)
            slots.append({
                'start': hearing.scheduled_date,
                'end': end_time,
                'hearing_id': hearing.id,
                'case_number': hearing.case.file_number
            })
        
        return Response({
            'courtroom': courtroom,
            'date': date,
            'booked_slots': slots
        })


class BulkScheduleHearingsView(generics.GenericAPIView):
    """View for bulk scheduling hearings"""
    permission_classes = [IsAuthenticated, CanScheduleHearings]
    serializer_class = BulkScheduleHearingSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        case_ids = serializer.validated_data['case_ids']
        hearing_data = serializer.validated_data['hearing_data']
        
        results = []
        for case_id in case_ids:
            try:
                case = Case.objects.get(id=case_id)
                hearing = Hearing.objects.create(
                    case=case,
                    judge=request.user,
                    **hearing_data
                )
                results.append({
                    'case_id': case_id,
                    'status': 'success',
                    'hearing_id': hearing.id
                })
            except Exception as e:
                results.append({
                    'case_id': case_id,
                    'status': 'failed',
                    'error': str(e)
                })
        
        return Response(results)


class UpcomingHearingsReportView(generics.GenericAPIView):
    """View for upcoming hearings report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        days = int(request.query_params.get('days', 7))
        
        end_date = timezone.now() + timedelta(days=days)
        
        hearings = Hearing.objects.filter(
            scheduled_date__gte=timezone.now(),
            scheduled_date__lte=end_date,
            status__in=['SCHEDULED', 'CONFIRMED']
        ).select_related('case', 'judge').order_by('scheduled_date')
        
        report = {
            'total': hearings.count(),
            'by_type': hearings.values('hearing_type').annotate(count=Count('id')),
            'by_judge': hearings.values('judge__first_name', 'judge__last_name').annotate(count=Count('id')),
            'hearings': HearingCalendarSerializer(hearings, many=True).data
        }
        
        return Response(report)


class JudgeHearingWorkloadView(generics.GenericAPIView):
    """View for judge hearing workload"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        judges = User.objects.filter(role='JUDGE')
        
        data = []
        for judge in judges:
            upcoming = Hearing.objects.filter(
                judge=judge,
                scheduled_date__gte=timezone.now(),
                status__in=['SCHEDULED', 'CONFIRMED']
            ).count()
            
            completed = Hearing.objects.filter(
                judge=judge,
                status='COMPLETED'
            ).count()
            
            data.append({
                'judge_id': judge.id,
                'judge_name': judge.get_full_name(),
                'upcoming_hearings': upcoming,
                'completed_hearings': completed,
                'total': upcoming + completed
            })
        
        return Response(data)


class JudgeCaseHearingListView(generics.ListAPIView):
    """
    Get Hearings for a Case
    GET /api/judge/cases/{case_id}/hearings
    """
    serializer_class = HearingSerializer
    permission_classes = [IsAuthenticated, IsJudge]

    def get_queryset(self):
        judge = self.request.user
        case_id = self.kwargs.get('case_id')
        
        # Ensure the case is assigned to this judge
        is_assigned = JudgeAssignment.objects.filter(
            judge=judge, case_id=case_id, is_active=True
        ).exists()
        
        if not is_assigned:
            return Hearing.objects.none()
            
        return Hearing.objects.filter(case_id=case_id)