from django.utils import timezone
from django.conf import settings
from .models import Hearing, HearingReminder
from notifications.services import create_notification
from core.utils.email import send_email_template
import logging

logger = logging.getLogger(__name__)


def send_hearing_reminders():
    """
    Send scheduled hearing reminders
    """
    now = timezone.now()
    reminders = HearingReminder.objects.filter(
        is_sent=False,
        scheduled_for__lte=now
    ).select_related('hearing', 'user')
    
    sent_count = 0
    for reminder in reminders:
        try:
            send_hearing_reminder_email(reminder)
            reminder.is_sent = True
            reminder.sent_at = now
            reminder.save()
            sent_count += 1
        except Exception as e:
            logger.error(f"Failed to send reminder {reminder.id}: {str(e)}")
    
    logger.info(f"Sent {sent_count} hearing reminders")
    return sent_count


def send_hearing_reminder_email(reminder):
    """
    Send reminder email for hearing
    """
    context = {
        'user': reminder.user,
        'hearing': reminder.hearing,
        'case': reminder.hearing.case,
        'frontend_url': settings.FRONTEND_URL,
        'reminder_type': reminder.reminder_type
    }
    
    hours_until = (reminder.hearing.scheduled_date - timezone.now()).total_seconds() / 3600
    
    if hours_until <= 1:
        template = 'emails/hearing_reminder_1h.html'
        subject = f"Reminder: Hearing in 1 hour - {reminder.hearing.case.file_number}"
    else:
        template = 'emails/hearing_reminder_24h.html'
        subject = f"Reminder: Hearing tomorrow - {reminder.hearing.case.file_number}"
    
    return send_email_template(
        subject=subject,
        template_name=template,
        context=context,
        recipient_list=[reminder.user.email]
    )


def send_hearing_notification_email(hearing, recipient, notification_type='SCHEDULED'):
    """
    Send detailed notification email for hearing scheduling/updates.
    Includes complete case details and hearing information.
    """
    context = {
        'user': recipient,
        'hearing': hearing,
        'case': hearing.case,
        'frontend_url': settings.FRONTEND_URL,
        'type': notification_type,
        'is_virtual': bool(hearing.virtual_meeting_link),
        'formatted_date': hearing.scheduled_date.strftime("%B %d, %Y"),
        'formatted_time': hearing.scheduled_date.strftime("%I:%M %p")
    }
    
    if notification_type == 'RESCHEDULED':
        subject = f"RE-SCHEDULED: Court Hearing - Case {hearing.case.file_number}"
    else:
        subject = f"NOTICE: Court Hearing Scheduled - Case {hearing.case.file_number}"
        
    return send_email_template(
        subject=subject,
        template_name='emails/hearing_detailed_notification.html',
        context=context,
        recipient_list=[recipient.email]
    )


def send_hearing_notification(hearing, notification_type):
    """
    Send notifications and emails for hearing updates
    """
    participants = hearing.participant_list.all()
    
    # Internal Notification Logic
    messages = {
        'JUDGE': f"You have a {hearing.hearing_type} hearing scheduled for case {hearing.case.file_number} on {hearing.scheduled_date.strftime('%B %d')}.",
        'CITIZEN': f"A {hearing.hearing_type} hearing has been scheduled for your case {hearing.case.file_number} on {hearing.scheduled_date.strftime('%B %d')}.",
        'DEFAULT': f"A hearing has been {notification_type.lower()} for case {hearing.case.file_number}."
    }
    
    from notifications.services import notify_case_participants
    notify_case_participants(
        case=hearing.case,
        type=f'HEARING_{notification_type}',
        title=f'Hearing {notification_type.title()}',
        message=messages
    )

    # Email Logic
    for participant in participants:
        try:
            send_hearing_notification_email(hearing, participant.user, notification_type)
        except Exception as e:
            logger.error(f"Failed to send hearing email to {participant.user.email}: {str(e)}")


class HearingService:
    @staticmethod
    def update_hearing(hearing, update_data):
        """
        Dynamically update hearing attributes.
        Protects sensitive fields from being modified via dynamic PATCH.
        """
        protected_fields = ['id', 'case', 'hearing_number', 'created_at']
        
        for key, value in update_data.items():
            if key not in protected_fields and hasattr(hearing, key):
                setattr(hearing, key, value)
        
        hearing.save()
        return hearing

    @staticmethod
    def create_next_hearing(current_hearing, next_data):
        """
        Create a follow-up hearing linked to the current one.
        Automatically copies context and participants.
        """
        from .models import HearingParticipant
        
        # Clone relevant fields from current hearing if not provided in next_data
        defaults = {
            'case': current_hearing.case,
            'judge': current_hearing.judge,
            'location': current_hearing.location,
            'hearing_format': current_hearing.hearing_format,
            'hearing_type': current_hearing.hearing_type,
            'previous_hearing': current_hearing,
            'status': 'SCHEDULED',
            'duration_minutes': current_hearing.duration_minutes,
        }
        
        # Clean next_data
        for field in ['id', 'case', 'previous_hearing']:
            next_data.pop(field, None)
            
        final_data = {**defaults, **next_data}
        
        # Create the new hearing
        new_hearing = Hearing.objects.create(**final_data)
        
        # Copy participants
        for participant in current_hearing.participant_list.all():
            HearingParticipant.objects.get_or_create(
                hearing=new_hearing,
                user=participant.user,
                defaults={'role_in_hearing': participant.role_in_hearing}
            )
            
        return new_hearing