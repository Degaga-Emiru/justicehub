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
    BulkScheduleHearingSerializer
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
        return HearingSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'ADMIN':
            return self.queryset
        elif user.role == 'JUDGE':
            return self.queryset.filter(judge=user)
        else:
            # For clients/lawyers, show hearings for their cases
            return self.queryset.filter(
                Q(case__created_by=user) |
                Q(case__plaintiff=user) |
                Q(case__defendant=user) |
                Q(case__plaintiff_lawyer=user) |
                Q(case__defendant_lawyer=user) |
                Q(participant_list__user=user)
            ).distinct()
    
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
        hearing = self.get_object()
        
        participant = get_object_or_404(
            HearingParticipant,
            hearing=hearing,
            user=request.user
        )
        
        serializer = HearingConfirmAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        participant.attendance_status = serializer.validated_data['status']
        participant.responded_at = timezone.now()
        participant.notes = serializer.validated_data.get('notes', '')
        participant.save()
        
        # Notify judge
        create_notification(
            user=hearing.judge,
            type='HEARING_RESPONSE',
            title='Attendance Response Received',
            message=f'{request.user.get_full_name()} has {participant.get_attendance_status_display().lower()} attendance',
            case=hearing.case
        )
        
        # Log Attendance
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.HEARING_ATTENDANCE,
            obj=hearing,
            description=f"{request.user.get_full_name()} confirmed attendance: {participant.get_attendance_status_display()}",
            entity_name=hearing.case.file_number
        )
        
        response_serializer = HearingParticipantSerializer(participant)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def cancel(self, request, pk=None):
        """Cancel hearing"""
        hearing = self.get_object()
        
        # Relaxed check: Only prevent cancellation if already COMPLETED or CANCELLED
        if hearing.status in ['COMPLETED', 'CANCELLED']:
            raise BusinessLogicError(f"Cannot cancel a hearing with status {hearing.status}")
        
        hearing.status = 'CANCELLED'
        hearing.cancelled_at = timezone.now()
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
        """Mark hearing as completed"""
        hearing = self.get_object()
        
        hearing.status = 'COMPLETED'
        hearing.completed_at = timezone.now()
        hearing.recording_url = request.data.get('recording_url')
        hearing.transcript_url = request.data.get('transcript_url')
        hearing.save()
        
        # Log Completion
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.HEARING_COMPLETED,
            obj=hearing,
            description=f"Hearing for case {hearing.case.file_number} completed",
            entity_name=hearing.case.file_number
        )

        return Response({
            "message": "Hearing marked as completed.",
            "status": "COMPLETED",
            "completed_at": hearing.completed_at
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHearingJudge])
    def reschedule(self, request, pk=None):
        """Reschedule hearing"""
        hearing = self.get_object()
        
        serializer = HearingRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_date = hearing.scheduled_date
        hearing.scheduled_date = serializer.validated_data['scheduled_date']
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
        
        response_serializer = HearingSerializer(new_hearing)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
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


class ConfirmAttendanceView(generics.UpdateAPIView):
    """View for confirming attendance"""
    queryset = HearingParticipant.objects.all()
    serializer_class = HearingParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return get_object_or_404(
            HearingParticipant,
            hearing_id=self.kwargs['pk'],
            user=self.request.user
        )
    
    def post(self, request, *args, **kwargs):
        """Support POST for confirmation along with PATCH"""
        return self.patch(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        participant = self.get_object()
        participant.attendance_status = request.data.get('status', 'CONFIRMED')
        participant.responded_at = timezone.now()
        participant.notes = request.data.get('notes', '')
        participant.save()
        return Response(self.get_serializer(participant).data)


class CancelHearingView(generics.GenericAPIView):
    """View for cancelling hearings"""
    permission_classes = [IsAuthenticated, IsHearingJudge]
    
    def post(self, request, pk):
        hearing = get_object_or_404(Hearing, pk=pk)
        
        hearing.status = 'CANCELLED'
        hearing.cancelled_at = timezone.now()
        hearing.save()
        
        return Response({"message": "Hearing cancelled successfully"})


class CompleteHearingView(generics.GenericAPIView):
    """View for completing hearings"""
    permission_classes = [IsAuthenticated, IsHearingJudge]
    
    def post(self, request, pk):
        hearing = get_object_or_404(Hearing, pk=pk)
        
        hearing.status = 'COMPLETED'
        hearing.completed_at = timezone.now()
        hearing.recording_url = request.data.get('recording_url')
        hearing.transcript_url = request.data.get('transcript_url')
        hearing.save()
        
        return Response({"message": "Hearing marked as completed"})


class HearingParticipantsView(generics.ListAPIView):
    """View for listing hearing participants"""
    serializer_class = HearingParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return HearingParticipant.objects.filter(hearing_id=self.kwargs['pk'])


class RescheduleHearingView(generics.GenericAPIView):
    """View for rescheduling hearings"""
    permission_classes = [IsAuthenticated, IsHearingJudge]
    serializer_class = HearingRescheduleSerializer
    
    def post(self, request, pk):
        hearing = get_object_or_404(Hearing, pk=pk)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
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
            notes=f"Rescheduled from {hearing.scheduled_date}. Reason: {serializer.validated_data.get('reason', 'Not specified')}"
        )
        
        # Mark old as rescheduled
        hearing.status = 'RESCHEDULED'
        hearing.save()
        
        response_serializer = HearingSerializer(new_hearing)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class HearingRemindersView(generics.ListAPIView):
    """View for listing hearing reminders"""
    serializer_class = HearingReminderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return HearingReminder.objects.filter(hearing_id=self.kwargs['pk'])


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