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


def send_hearing_notification(hearing, notification_type):
    """
    Send notifications for hearing updates
    """
    participants = hearing.participant_list.all()
    
    for participant in participants:
        create_notification(
            user=participant.user,
            type=notification_type,
            title='Hearing Update',
            message=f'Hearing for case {hearing.case.file_number} has been {notification_type.lower()}',
            case=hearing.case
        )