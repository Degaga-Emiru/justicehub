from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Decision
from notifications.services import create_notification
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Decision)
def handle_decision_created(sender, instance, created, **kwargs):
    """
    Handle decision creation
    """
    if created:
        logger.info(f"Decision {instance.decision_number} created for case {instance.case.file_number}")
        
        # Notify case creator
        create_notification(
            user=instance.case.created_by,
            type='DECISION_DRAFTED',
            title='Decision Drafted',
            message=f'A decision has been drafted for your case.',
            case=instance.case
        )


@receiver(post_save, sender=Decision)
def handle_decision_published(sender, instance, **kwargs):
    """
    Handle decision publication
    """
    if instance.is_published and instance.pk:
        try:
            old = Decision.objects.get(pk=instance.pk)
            if not old.is_published:
                logger.info(f"Decision {instance.decision_number} published")
                
                # Update case status
                if instance.case.status != 'CLOSED':
                    instance.case.status = 'CLOSED'
                    instance.case.closed_date = instance.published_at
                    instance.case.save()
                    
        except Decision.DoesNotExist:
            pass