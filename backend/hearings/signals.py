from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Hearing, HearingParticipant
from notifications.services import create_notification
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Hearing)
def handle_hearing_created(sender, instance, created, **kwargs):
    """
    Handle hearing creation
    """
    if created:
        logger.info(f"Hearing created for case {instance.case.file_number}")
        
        # Create notification for case creator
        create_notification(
            user=instance.case.created_by,
            type='HEARING_SCHEDULED',
            title='Hearing Scheduled',
            message=f'A hearing has been scheduled for your case on {instance.scheduled_date.strftime("%B %d, %Y")}',
            case=instance.case
        )


@receiver(pre_save, sender=HearingParticipant)
def handle_participant_response(sender, instance, **kwargs):
    """
    Handle participant response to hearing invitation
    """
    if instance.pk:
        try:
            old = HearingParticipant.objects.get(pk=instance.pk)
            if old.attendance_status != instance.attendance_status and instance.attendance_status != 'PENDING':
                logger.info(f"Participant {instance.user.email} {instance.attendance_status} for hearing {instance.hearing.id}")
                
                # Notify judge
                create_notification(
                    user=instance.hearing.judge,
                    type='HEARING_RESPONSE',
                    title='Attendance Response',
                    message=f'{instance.user.get_full_name()} has {instance.get_attendance_status_display().lower()} attendance.',
                    case=instance.hearing.case
                )
        except HearingParticipant.DoesNotExist:
            pass