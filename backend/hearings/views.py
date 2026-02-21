from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Hearing, HearingParticipant, HearingReminder
from .serializers import (
    HearingSerializer, HearingParticipantSerializer,
    HearingConfirmAttendanceSerializer, HearingReminderSerializer
)
from cases.permissions import IsJudge, IsAssignedJudge
from notifications.services import create_notification, notify_case_participants
from core.utils.email import send_email_template
from django.conf import settings


class HearingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing hearings
    """
    serializer_class = HearingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'ADMIN':
            return Hearing.objects.all()
        elif user.role == 'JUDGE':
            return Hearing.objects.filter(judge=user)
        else:
            # For clients/lawyers, show hearings for their cases
            return Hearing.objects.filter(
                case__created_by=user
            ) | Hearing.objects.filter(
                participant_list__user=user
            ).distinct()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsJudge]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        hearing = serializer.save()
        
        # Notify case participants
        notify_case_participants(
            case=hearing.case,
            type='HEARING_SCHEDULED',
            title='New Hearing Scheduled',
            message=f'A hearing has been scheduled for {hearing.scheduled_date.strftime("%B %d, %Y at %I:%M %p")}',
            exclude_users=[self.request.user]
        )
        
        # Schedule reminders
        self.schedule_reminders(hearing)
    
    @action(detail=True, methods=['post'])
    def confirm_attendance(self, request, pk=None):
        """
        Confirm attendance for a hearing
        """
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
            message=f'{request.user.get_full_name()} has {participant.get_attendance_status_display().lower()} attendance for hearing.',
            case=hearing.case
        )
        
        return Response(HearingParticipantSerializer(participant).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsJudge])
    def cancel(self, request, pk=None):
        """
        Cancel a hearing
        """
        hearing = self.get_object()
        
        if hearing.scheduled_date <= timezone.now():
            return Response(
                {"error": "Cannot cancel past hearings."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hearing.status = 'CANCELLED'
        hearing.cancelled_at = timezone.now()
        hearing.save()
        
        # Notify participants
        notify_case_participants(
            case=hearing.case,
            type='HEARING_CANCELLED',
            title='Hearing Cancelled',
            message=f'The hearing scheduled for {hearing.scheduled_date.strftime("%B %d, %Y at %I:%M %p")} has been cancelled.',
            exclude_users=[request.user]
        )
        
        return Response({"message": "Hearing cancelled successfully."})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsJudge])
    def complete(self, request, pk=None):
        """
        Mark hearing as completed
        """
        hearing = self.get_object()
        
        hearing.status = 'COMPLETED'
        hearing.completed_at = timezone.now()
        hearing.recording_url = request.data.get('recording_url')
        hearing.transcript_url = request.data.get('transcript_url')
        hearing.save()
        
        return Response({"message": "Hearing marked as completed."})
    
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """
        Get hearing participants
        """
        hearing = self.get_object()
        participants = hearing.participant_list.all()
        serializer = HearingParticipantSerializer(participants, many=True)
        return Response(serializer.data)
    
    def schedule_reminders(self, hearing):
        """
        Schedule reminders for hearing
        """
        from datetime import timedelta
        
        # Schedule 24h reminder
        HearingReminder.objects.create(
            hearing=hearing,
            user=hearing.judge,
            reminder_type='EMAIL',
            scheduled_for=hearing.scheduled_date - timedelta(hours=24)
        )
        
        # Schedule 1h reminder for all participants
        participants = hearing.participant_list.all()
        for participant in participants:
            HearingReminder.objects.create(
                hearing=hearing,
                user=participant.user,
                reminder_type='EMAIL',
                scheduled_for=hearing.scheduled_date - timedelta(hours=1)
            )


class ConfirmAttendanceView(generics.UpdateAPIView):
    """
    View for confirming attendance
    """
    queryset = HearingParticipant.objects.all()
    serializer_class = HearingParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return get_object_or_404(
            HearingParticipant,
            hearing_id=self.kwargs['hearing_id'],
            user=self.request.user
        )
    
    def patch(self, request, *args, **kwargs):
        participant = self.get_object()
        participant.attendance_status = request.data.get('status', 'CONFIRMED')
        participant.responded_at = timezone.now()
        participant.save()
        return Response(self.get_serializer(participant).data)