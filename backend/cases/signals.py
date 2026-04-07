from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import Case, CaseDocument, JudgeAssignment
from notifications.services import create_notification
from .utils import send_case_status_notification, log_case_action
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Case)
def handle_case_created(sender, instance, created, **kwargs):
    """
    Handle case creation
    """
    if created:
        logger.info(f"New case created: {instance.id} by {instance.created_by.email}")
        
        # Create notification for case creator
        create_notification(
            user=instance.created_by,
            type='CASE_SUBMITTED',
            title='Case Submitted Successfully',
            message=f'Your case "{instance.title}" has been submitted and is pending review.',
            case=instance
        )
        
        # Notify all registrars
        from accounts.models import User
        registrars = User.objects.filter(role='REGISTRAR')
        for registrar in registrars:
            create_notification(
                user=registrar,
                type='CASE_SUBMITTED',
                title='New Case Pending Review',
                message=f'New case "{instance.title}" submitted by {instance.created_by.get_full_name()}.',
                case=instance,
                priority='HIGH'
            )


@receiver(pre_save, sender=Case)
def handle_case_status_change(sender, instance, **kwargs):
    """
    Handle case status changes
    """
    if instance.pk:
        try:
            old_instance = Case.objects.get(pk=instance.pk)
            
            # Check if status changed
            if old_instance.status != instance.status:
                logger.info(f"Case {instance.id} status changed from {old_instance.status} to {instance.status}")
                
                # Send notifications
                send_case_status_notification(instance, old_instance.status, instance.status)
                
                # Handle specific status changes
                if instance.status == 'ACCEPTED' and not instance.file_number:
                    from .utils import generate_case_number
                    instance.file_number = generate_case_number()
                
                elif instance.status == 'CLOSED':
                    instance.closed_date = timezone.now()
                
                elif instance.status == 'REJECTED' and not instance.rejection_reason:
                    logger.warning(f"Case {instance.id} rejected without reason")
            
            # Check if file number generated
            if not old_instance.file_number and instance.file_number:
                logger.info(f"File number generated for case {instance.id}: {instance.file_number}")
                
                # Notify client
                create_notification(
                    user=instance.created_by,
                    type='CASE_ACCEPTED',
                    title='Case Accepted',
                    message=f'Your case has been accepted. File Number: {instance.file_number}',
                    case=instance
                )
                
        except Case.DoesNotExist:
            pass


@receiver(post_save, sender=CaseDocument)
def handle_document_upload(sender, instance, created, **kwargs):
    """
    Handle document upload
    """
    if created:
        logger.info(f"Document uploaded to case {instance.case.id}: {instance.file_name}")
        
        # Notify case parties
        case = instance.case
        parties = [
            case.created_by,
            case.plaintiff,
            case.defendant,
            case.plaintiff_lawyer,
            case.defendant_lawyer
        ]
        
        # Get assigned judge
        active_assignment = case.judge_assignments.filter(is_active=True).first()
        if active_assignment:
            parties.append(active_assignment.judge)
        
        # Send notifications
        for party in set(filter(None, parties)):
            if party != instance.uploaded_by:  # Don't notify uploader
                create_notification(
                    user=party,
                    type='DOCUMENT_UPLOADED',
                    title='Document Uploaded',
                    message=f'A new document "{instance.file_name}" has been uploaded to case {case.file_number}.',
                    case=case
                )


@receiver(post_save, sender=JudgeAssignment)
def handle_judge_assignment(sender, instance, created, **kwargs):
    """
    Handle judge assignment
    """
    if created:
        logger.info(f"Judge {instance.judge.email} assigned to case {instance.case.id}")
        
        # Notify judge
        create_notification(
            user=instance.judge,
            type='JUDGE_ASSIGNED',
            title='New Case Assignment',
            message=f'You have been assigned to case: {instance.case.title} (File No: {instance.case.file_number})',
            case=instance.case,
            priority='HIGH',
            action_url='/dashboard/judge'
        )
        
        # Notify case creator
        create_notification(
            user=instance.case.created_by,
            type='JUDGE_ASSIGNED',
            title='Judge Assigned to Your Case',
            message=f'Judge {instance.judge.get_full_name()} has been assigned to your case.',
            case=instance.case,
            action_url='/dashboard/client'
        )
        
        # Send email to judge
        from core.utils.email import send_email_template
        context = {
            'judge': instance.judge,
            'case': instance.case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"New Case Assignment - {instance.case.file_number}",
            template_name='emails/case_assigned.html',
            context=context,
            recipient_list=[instance.judge.email]
        )
    
    else:
        # Check if assignment ended
        if instance.ended_at and instance.is_active == False:
            logger.info(f"Judge assignment ended for case {instance.case.id}")


@receiver(post_delete, sender=CaseDocument)
def handle_document_delete(sender, instance, **kwargs):
    """
    Handle document deletion - clean up file storage
    """
    logger.info(f"Document deleted: {instance.file_name} from case {instance.case.id}")
    
    # Delete file from storage
    if instance.file:
        try:
            storage = instance.file.storage
            if storage.exists(instance.file.name):
                storage.delete(instance.file.name)
        except Exception as e:
            logger.error(f"Error deleting file {instance.file.name}: {str(e)}")