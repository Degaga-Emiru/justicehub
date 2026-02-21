from django.utils import timezone
from django.conf import settings
from .models import Notification, NotificationPreference
from core.utils.email import send_email_template
import logging

logger = logging.getLogger(__name__)


def create_notification(user, type, title, message, case=None, priority='MEDIUM', action_url=None, metadata=None):
    """
    Create a notification for a user
    """
    try:
        notification = Notification.objects.create(
            user=user,
            type=type,
            priority=priority,
            title=title,
            message=message,
            case=case,
            action_url=action_url,
            metadata=metadata or {}
        )
        
        # Check if user wants email notifications for this type
        try:
            prefs = NotificationPreference.objects.get(user=user)
        except NotificationPreference.DoesNotExist:
            prefs = NotificationPreference.objects.create(user=user)
        
        # Send email if enabled
        if prefs.email_notifications and should_send_email(prefs, type):
            send_notification_email(notification)
        
        # Send push notification if enabled (implement based on your push service)
        if prefs.push_notifications and should_send_push(prefs, type):
            send_push_notification(notification)
        
        logger.info(f"Notification created for user {user.email}: {type}")
        return notification
        
    except Exception as e:
        logger.error(f"Failed to create notification for user {user.email}: {str(e)}")
        return None


def should_send_email(prefs, notification_type):
    """
    Check if email should be sent based on preferences and quiet hours
    """
    # Check quiet hours
    if prefs.quiet_hours_start and prefs.quiet_hours_end:
        current_time = timezone.localtime().time()
        if prefs.quiet_hours_start <= current_time <= prefs.quiet_hours_end:
            return False
    
    # Check notification type preferences
    type_mapping = {
        'CASE_': prefs.case_updates,
        'HEARING_': prefs.hearing_updates,
        'DECISION_': prefs.decision_updates,
        'DOCUMENT_': prefs.document_updates,
        'SYSTEM_': prefs.system_alerts,
    }
    
    for prefix, preference in type_mapping.items():
        if notification_type.startswith(prefix):
            return preference
    
    return True


def should_send_push(prefs, notification_type):
    """
    Check if push notification should be sent
    """
    # Implement based on your push notification service
    return True


def send_notification_email(notification):
    """
    Send notification email
    """
    context = {
        'notification': notification,
        'user': notification.user,
        'frontend_url': settings.FRONTEND_URL
    }
    
    success = send_email_template(
        subject=f"Justice Hub: {notification.title}",
        template_name='emails/notification.html',
        context=context,
        recipient_list=[notification.user.email]
    )
    
    if success:
        notification.email_sent = True
        notification.save(update_fields=['email_sent'])
    
    return success


def send_push_notification(notification):
    """
    Send push notification (implement with Firebase or similar)
    """
    # Implement push notification logic here
    pass


def notify_case_participants(case, type, title, message, exclude_users=None):
    """
    Send notification to all case participants
    """
    exclude_users = exclude_users or []
    
    # Collect all participants
    participants = []
    
    if case.created_by and case.created_by not in exclude_users:
        participants.append(case.created_by)
    
    if case.plaintiff and case.plaintiff not in exclude_users:
        participants.append(case.plaintiff)
    
    if case.defendant and case.defendant not in exclude_users:
        participants.append(case.defendant)
    
    if case.plaintiff_lawyer and case.plaintiff_lawyer not in exclude_users:
        participants.append(case.plaintiff_lawyer)
    
    if case.defendant_lawyer and case.defendant_lawyer not in exclude_users:
        participants.append(case.defendant_lawyer)
    
    # Get active judge
    active_assignment = case.judge_assignments.filter(is_active=True).first()
    if active_assignment and active_assignment.judge not in exclude_users:
        participants.append(active_assignment.judge)
    
    # Create notifications
    for user in set(participants):
        create_notification(
            user=user,
            type=type,
            title=title,
            message=message,
            case=case
        )