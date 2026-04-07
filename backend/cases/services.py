import logging
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
from accounts.models import User
from .models import Case, JudgeAssignment, CaseCategory, CaseActionRequest
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog
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
            # Map legacy action names to AuditLog.ActionType
            if action == 'CASE_APPROVED':
                action_type = AuditLog.ActionType.CASE_ACCEPTED
            elif hasattr(AuditLog.ActionType, action):
                action_type = getattr(AuditLog.ActionType, action)
            else:
                action_type = AuditLog.ActionType.CASE_UPDATED
                
            create_audit_log(
                action_type=action_type,
                user=user,
                obj=entity,
                description=f"Action: {action}",
                changes=details,
                entity_name=getattr(entity, 'title', str(entity))
            )
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to log action '{action}': {str(e)}")


class JudgeAssignmentService:
    """Service for automatic judge assignment"""
    
    @classmethod
    def find_available_judges(cls, category):
        """Find available judges for a case category with fallback"""
        from accounts.models import User
        
        # 1. Try to find judges with the required specialization
        judges = User.objects.filter(
            role='JUDGE',
            judge_profile__specializations=category,
            judge_profile__is_active=True,
            is_active=True
        ).select_related('judge_profile')
        
        # 2. Fallback: If no specialized judges, find ANY active judge with a profile
        if not judges.exists():
            logging.getLogger(__name__).info(f"No specialized judges for category {category.name}. Falling back to any active judge.")
            judges = User.objects.filter(
                role='JUDGE',
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
        
        case.status = CaseStatus.ASSIGNED
        case.save()
        
        # Log Assignment
        create_audit_log(
            action_type=AuditLog.ActionType.CASE_ASSIGNED,
            obj=case,
            description=f"Judge {selected.get_full_name()} assigned to case {case.file_number}.",
            user=assigned_by or case.reviewed_by,
            changes={'judge': {'old': None, 'new': selected.get_full_name()}},
            entity_name=case.file_number
        )

        # Create notifications
        cls._send_assignment_notifications(assignment)
        
        return assignment
    
    @classmethod
    @transaction.atomic
    def assign_judge_manually(cls, case, judge_id, assigned_by, notes=None):
        """
        Manually assign a judge to a case (Registrar/Admin only)
        """
        from accounts.models import User
        
        # 1. Validation
        # Relaxed: Allow assignment even if not paid yet, but record status
        
        try:
            selected_judge = User.objects.get(id=judge_id, role='JUDGE', is_active=True)
        except User.DoesNotExist:
            raise ValidationError("Selected user is not an active judge.")
            
        # 2. Check for existing active assignment
        previous_assignment = JudgeAssignment.objects.filter(case=case, is_active=True).first()
        previous_judge_name = previous_assignment.judge.get_full_name() if previous_assignment else "None"
        
        if previous_assignment:
            if previous_assignment.judge == selected_judge:
                return previous_assignment # Already assigned to this judge
            
            # Deactivate previous assignment
            previous_assignment.is_active = False
            previous_assignment.ended_at = timezone.now()
            previous_assignment.save()
            
        # 3. Create new assignment
        assignment = JudgeAssignment.objects.create(
            case=case,
            judge=selected_judge,
            assigned_by=assigned_by,
            is_active=True,
            assignment_notes=notes
        )
        
        # 4. Update case status if not already assigned
        if case.status != CaseStatus.ASSIGNED:
            case.status = CaseStatus.ASSIGNED
            case.save()
            
        # 5. Log Assignment / Manul Override
        action_desc = f"Judge {selected_judge.get_full_name()} manually assigned "
        if previous_assignment:
            action_desc += f"(Replaced {previous_judge_name})"
        else:
            action_desc += "to case."
            
        create_audit_log(
            action_type=AuditLog.ActionType.CASE_ASSIGNED,
            obj=case,
            description=action_desc,
            user=assigned_by,
            changes={
                'judge': {
                    'old': previous_judge_name, 
                    'new': selected_judge.get_full_name(),
                    'override': True,
                    'reason': notes
                }
            },
            entity_name=case.file_number or case.title
        )

        # 6. Create notifications
        cls._send_assignment_notifications(assignment)
        
        return assignment
     
     
    @classmethod
    def _handle_no_judges_available(cls, case):
        """Handle case when no judges are available"""
        logging.getLogger(__name__).warning(f"No judges available for case {case.id} in category {case.category.name}")
        
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
            priority='HIGH',
            action_url='/dashboard/judge'
        )
        
        # Notify case creator
        create_notification(
            user=assignment.case.created_by,
            type='JUDGE_ASSIGNED',
            title='Judge Assigned to Your Case',
            message=(
                f"Judge {assignment.judge.get_full_name()} has been assigned "
                f"to your case: {assignment.case.title}"
            ),
            case=assignment.case,
            action_url='/dashboard/client'
        )
        
        # Notify defendant
        if assignment.case.defendant:
            create_notification(
                user=assignment.case.defendant,
                type='JUDGE_ASSIGNED',
                title='Judge Assigned to Case',
                message=(
                    f"Judge {assignment.judge.get_full_name()} has been assigned "
                    f"to case: {assignment.case.title} (File No: {assignment.case.file_number})"
                ),
                case=assignment.case
            )
    
    @classmethod
    def _handle_no_judges_available(cls, case):
        """Handle case when no judges are available"""
        logging.getLogger(__name__).warning(f"No judges available for case {case.id} in category {case.category.name}")
        
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
        case.file_number = case.generate_file_number()
        case.save()
        
        # Log Approval
        create_audit_log(
            action_type=AuditLog.ActionType.CASE_ACCEPTED,
            obj=case,
            description=f"Case {case.file_number} approved by {reviewer.get_full_name()}.",
            user=reviewer,
            changes={'status': {'old': 'PENDING_REVIEW', 'new': CaseStatus.APPROVED}},
            entity_name=case.file_number
        )

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
        
        # Notify defendant
        if case.defendant:
            create_notification(
                user=case.defendant,
                type='CASE_ACCEPTED',
                title='Legal Case Opened Against You',
                message=(
                    f"A legal case '{case.title}' has been officially opened against you. "
                    f"File Number: {case.file_number}. "
                    "You will be notified of further actions required."
                ),
                case=case
            )
            cls._send_case_opened_email_to_defendant(case)
        
        # Trigger automatic judge assignment immediately after approval
        try:
            from .services import JudgeAssignmentService
            JudgeAssignmentService.assign_judge(case, assigned_by=reviewer)
        except Exception as e:
            logging.getLogger(__name__).error(f"Initial automatic judge assignment failed for case {case.id}: {str(e)}")
            
        # Trigger payment initialization (Sends email automatically)
        from payments.services import PaymentService
        PaymentService.initiate_payment(case.id, case.created_by)
        
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
        case.rejection_reason = reason
        case.save()
        
        # Log Rejection
        create_audit_log(
            action_type=AuditLog.ActionType.CASE_REJECTED,
            obj=case,
            description=f"Case rejected by {reviewer.get_full_name()}. Reason: {reason}",
            user=reviewer,
            changes={'status': {'old': 'PENDING_REVIEW', 'new': CaseStatus.REJECTED}},
            entity_name=case.title
        )

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
    def _send_case_opened_email_to_defendant(cls, case):
        """Send case opened email to defendant"""
        context = {
            'defendant': case.defendant,
            'case': case,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"Notice of Legal Case - {case.file_number}",
            template_name='emails/case_opened_defendant.html',
            context=context,
            recipient_list=[case.defendant.email]
        )
    
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
        """Notify all users with REGISTRAR or CLERK role about a new case"""
        registrars = User.objects.filter(role__in=['REGISTRAR', 'CLERK'], is_active=True)
        
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
                
        #         # 2. Email Notification
        #         cls._send_registrar_new_case_email(registrar, case)
        # except Exception as e:
        #     logger.error(f"Failed to notify registrars for case {case.id}: {str(e)}")

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

    @classmethod
    def notify_defendant_action_required(cls, case, action_description):
        """Notify defendant that a specific action is required by the judge"""
        if not case.defendant:
            return
            
        create_notification(
            user=case.defendant,
            type='ACTION_REQUIRED',
            title='Court Action Required',
            message=f"The judge has requested a specific action for case {case.file_number}: {action_description}",
            case=case,
            priority='HIGH'
        )
        
        # Create CaseActionRequest record
        CaseActionRequest.objects.create(
            case=case,
            requester=case.reviewed_by or case.judge_assignments.filter(is_active=True).first().judge,
            action_description=action_description,
            status='PENDING'
        )
