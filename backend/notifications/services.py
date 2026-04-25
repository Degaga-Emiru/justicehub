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
        
        # Check if user wants email notifications
        try:
            prefs = NotificationPreference.objects.get(user=user)
        except NotificationPreference.DoesNotExist:
            prefs = NotificationPreference.objects.create(user=user)
        
        # Send email if enabled
        if prefs.email_notifications:
            send_notification_email(notification)
        
        logger.info(f"Notification created for user {user.email}: {type}")
        return notification
        
    except Exception as e:
        logger.error(f"Failed to create notification for user {user.email}: {str(e)}")
        return None


def send_notification_email(notification):
    """
    Send notification email
    """
    # Map notification types to specialized templates
    TEMPLATE_MAP = {
        'ACTION_REQUIRED': 'emails/defendant_action_required.html',
        'JUDGE_ASSIGNED': 'emails/case_assigned_defendant.html' if notification.user.role == 'CITIZEN' else 'emails/case_assigned.html',
        'CASE_ACCEPTED': 'emails/case_opened_defendant.html' if notification.user.role == 'CITIZEN' else 'emails/case_accepted.html',
        'HEARING_SCHEDULED': 'emails/hearing_scheduled.html',
        'DECISION_ISSUED': 'emails/decision_issued.html',
    }
    
    template_name = TEMPLATE_MAP.get(notification.type, 'emails/notification.html')
    
    context = {
        'notification': notification,
        'user': notification.user,
        'defendant': notification.user,  # Alias for templates that use 'defendant'
        'case': notification.case,
        'action_description': notification.message, # Alias for action requests
        'frontend_url': settings.FRONTEND_URL
    }
    
    success = send_email_template(
        subject=f"Justice Hub: {notification.title}",
        template_name=template_name,
        context=context,
        recipient_list=[notification.user.email]
    )
    
    if success:
        notification.email_sent = True
        notification.save(update_fields=['email_sent'])
    
    return success


def notify_case_participants(case, type, title, message, exclude_users=None):
    """
    Send notification to all case participants.
    'message' can be a string (generic) or a dict with role-based overrides:
    {'JUDGE': '...', 'CITIZEN': '...', 'LAWYER': '...', 'DEFAULT': '...'}
    """
    exclude_users = exclude_users or []
    
    # Collect all participants with their roles
    participants = []
    
    if case.created_by and case.created_by not in exclude_users:
        participants.append(case.created_by)
    
    if case.plaintiff and case.plaintiff and case.plaintiff not in exclude_users:
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
        role_message = message
        if isinstance(message, dict):
            # Try specific role first, then group roles, then default
            role_message = message.get(user.role) or message.get('DEFAULT')
            
            # Special handling for citizens (Plaintiff/Defendant) if role key is 'CITIZEN'
            if not role_message and user.role == 'CITIZEN':
                role_message = message.get('CITIZEN')
                
        create_notification(
            user=user,
            type=type,
            title=title,
            message=role_message or str(message),
            case=case
        )