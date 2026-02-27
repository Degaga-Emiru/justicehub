import logging
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
from accounts.models import User
from .models import Case, JudgeAssignment, CaseCategory, UserActionLog
from notifications.services import create_notification
from core.utils.email import send_email_template
from .constants import CaseStatus

logger = logging.getLogger(__name__)


class AuditService:
    """Service for logging system and user actions"""
    
    @classmethod
    def log_action(cls, user, action, entity, details=None):
        """Log a user action to the audit trail"""
        try:
            UserActionLog.objects.create(
                user=user,
                action=action,
                entity_type=entity.__class__.__name__,
                entity_id=entity.id if hasattr(entity, 'id') else None,
                details=details or {}
            )
        except Exception as e:
            logger.error(f"Failed to log action '{action}': {str(e)}")


class JudgeAssignmentService:
    """Service for automatic judge assignment"""
    
    @classmethod
    def find_available_judges(cls, category):
        """Find available judges for a case category"""
        from accounts.models import User
        
        # Get all judges with the required specialization
        judges = User.objects.filter(
            role='JUDGE',
            judge_profile__specializations=category,
            judge_profile__is_active=True,
            is_active=True
        ).select_related('judge_profile')
        
        available_judges = []
        for judge in judges:
            active_count = JudgeAssignment.objects.filter(
                judge=judge,
                is_active=True
            ).count()
            
            if active_count < judge.judge_profile.max_active_cases:
                available_judges.append({
                    'judge': judge,
                    'active_count': active_count,
                    'max_cases': judge.judge_profile.max_active_cases
                })
        
        # Sort by active count (lowest first)
        return sorted(available_judges, key=lambda x: x['active_count'])
    
    @classmethod
    @transaction.atomic
    def assign_judge(cls, case, assigned_by=None):
        """
        Automatically assign a judge to a case
        Returns the assignment if successful, None otherwise
        """
        available = cls.find_available_judges(case.category)
        
        if not available:
            # No judges available
            cls._handle_no_judges_available(case)
            return None
        
        # Select judge with lowest caseload
        selected = available[0]['judge']
        
        # Create assignment
        assignment = JudgeAssignment.objects.create(
            case=case,
            judge=selected,
            assigned_by=assigned_by or case.reviewed_by,
            is_active=True
        )
        
        # Update case status
        case.status = CaseStatus.ASSIGNED
        case.save()
        
        # Create notifications
        cls._send_assignment_notifications(assignment)
        
        return assignment
     
     
    @classmethod
    def _handle_no_judges_available(cls, case):
        """Handle case when no judges are available"""
        logger.warning(f"No judges available for case {case.id} in category {case.category.name}")
        
        # Notify all registrars
        registrars = User.objects.filter(role__in=['REGISTRAR', 'CLERK'])
        for registrar in registrars:
            create_notification(
                user=registrar,
                type='SYSTEM_ALERT',
                title='Judge Assignment Failed',
                message=(
                    f"No judges available for case '{case.title}' "
                    f"in category {case.category.name}. Manual intervention required."
                ),
                case=case,
                priority='HIGH'
            )
            
    
    @classmethod
    def _send_assignment_notifications(cls, assignment):
        """Send notifications for new assignment"""
        # Notify judge
        create_notification(
            user=assignment.judge,
            type='JUDGE_ASSIGNED',
            title='New Case Assignment',
            message=(
                f"You have been assigned to case: {assignment.case.title} "
                f"(File No: {assignment.case.file_number})"
            ),
            case=assignment.case,
            priority='HIGH'
        )
        
        # Send email to judge
        cls._send_assignment_email(assignment)
        
        # Notify case creator
        create_notification(
            user=assignment.case.created_by,
            type='JUDGE_ASSIGNED',
            title='Judge Assigned to Your Case',
            message=(
                f"Judge {assignment.judge.get_full_name()} has been assigned "
                f"to your case: {assignment.case.title}"
            ),
            case=assignment.case
        )
    
    @classmethod
    def _send_assignment_email(cls, assignment):
        """Send assignment email to judge"""
        context = {
            'judge': assignment.judge,
            'case': assignment.case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"New Case Assignment - {assignment.case.file_number}",
            template_name='emails/case_assigned.html',
            context=context,
            recipient_list=[assignment.judge.email]
        )


class CaseReviewService:
    """Service for case review operations"""
    
    @classmethod
    @transaction.atomic
    def accept_case(cls, case, reviewer, court_name, court_room=None):
        """Accept a case and trigger payment flow"""
        # Update case
        case.status = CaseStatus.APPROVED
        case.reviewed_by = reviewer
        case.reviewed_at = timezone.now()
        case.court_name = court_name
        case.court_room = court_room
        case.file_number = case.generate_file_number()
        case.save()
        
        # Notify client
        create_notification(
            user=case.created_by,
            type='CASE_ACCEPTED',
            title='Case Approved',
            message=(
                f"Your case '{case.title}' has been approved. "
                f"Please proceed with the payment of {case.category.fee} ETB. "
                f"File Number: {case.file_number}"
            ),
            case=case
        )
        
        # Trigger registrar notification
        # Log action
        AuditService.log_action(
            user=reviewer,
            action='CASE_APPROVED',
            entity=case,
            details={'court_name': court_name, 'file_number': case.file_number}
        )

        # Send payment instruction email
        cls._send_payment_instruction_email(case)
        
        return case
    
    @classmethod
    def _send_payment_instruction_email(cls, case):
        """Send payment instruction email to client"""
        context = {
            'client': case.created_by,
            'case': case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"Action Required: Payment for Case {case.file_number}",
            template_name='emails/payment_instruction.html',
            context=context,
            recipient_list=[case.created_by.email]
        )
    
    @classmethod
    @transaction.atomic
    def reject_case(cls, case, reviewer, reason):
        """Reject a case with reason"""
        case.status = CaseStatus.REJECTED
        case.reviewed_by = reviewer
        case.reviewed_at = timezone.now()
        case.rejection_reason = reason
        case.save()
        
        # Notify client
        create_notification(
            user=case.created_by,
            type='CASE_REJECTED',
            title='Case Rejected',
            message=f"Your case '{case.title}' has been rejected. Reason: {reason}",
            case=case,
            priority='HIGH'
        )
        
        # Log action
        AuditService.log_action(
            user=reviewer,
            action='CASE_REJECTED',
            entity=case,
            details={'reason': reason}
        )

        # Send email
        cls._send_rejection_email(case)
        
        return case
    
    @classmethod
    def _send_acceptance_email(cls, case):
        """Send acceptance email to client"""
        context = {
            'client': case.created_by,
            'case': case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"Case Accepted - {case.file_number}",
            template_name='emails/case_accepted.html',
            context=context,
            recipient_list=[case.created_by.email]
        )
    
    @classmethod
    def _send_rejection_email(cls, case):
        """Send rejection email to client"""
        context = {
            'client': case.created_by,
            'case': case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"Case Status Update - {case.title}",
            template_name='emails/case_rejected.html',
            context=context,
            recipient_list=[case.created_by.email]
        )


class CaseNotificationService:
    """Service for complex case-related notifications"""

    @classmethod
    def notify_registrars_new_case(cls, case):
        """Notify all users with REGISTRAR role about a new case"""
        registrars = User.objects.filter(role='REGISTRAR', is_active=True)
        
        for registrar in registrars:
            # 1. Internal Notification
            create_notification(
                user=registrar,
                type='NEW_CASE_FILED',
                title='New Case Filed',
                message=f"A new case '{case.title}' has been filed and is pending review.",
                case=case,
                priority='MEDIUM'
            )
            
            # 2. Email Notification
            cls._send_registrar_new_case_email(registrar, case)

    @classmethod
    def _send_registrar_new_case_email(cls, registrar, case):
        """Send email to registrar about new case"""
        context = {
            'registrar': registrar,
            'case': case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"New Case Assignment Review Needed - {case.title[:50]}",
            template_name='emails/registrar_new_case.html',
            context=context,
            recipient_list=[registrar.email]
        )
