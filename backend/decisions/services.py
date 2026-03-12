from django.db import transaction
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML
from django.conf import settings
from .models import Decision, DecisionDelivery, DecisionVersion, DecisionComment, DecisionAppeal
from notifications.services import create_notification
from cases.constants import CaseStatus
from cases.models import User, CaseDocument
from hearings.models import Hearing
from core.exceptions import BusinessLogicError
from core.utils.email import send_email_template
import logging

logger = logging.getLogger(__name__)


class DecisionWorkflowService:
    @staticmethod
    def save_draft(decision, user, is_major_change=False):
        """
        Saves a decision draft and creates a version snapshot if it's a major change.
        """
        if decision.status != Decision.DecisionStatus.DRAFT:
            raise BusinessLogicError("Only draft decisions can be updated as drafts.")

        with transaction.atomic():
            if is_major_change:
                # Create snapshot before incrementing version
                DecisionVersion.objects.create(
                    decision=decision,
                    version=decision.version,
                    title=decision.title,
                    introduction=decision.introduction,
                    background=decision.background,
                    analysis=decision.analysis,
                    conclusion=decision.conclusion,
                    order=decision.order,
                    created_by=user
                )
                decision.version += 1
            
            decision.save()
        return decision

    @staticmethod
    def finalize_decision(decision, user):
        """
        Finalizes a decision, generates PDF, and notifies Registrar for review.
        """
        if decision.status != Decision.DecisionStatus.DRAFT:
            raise BusinessLogicError("Only draft decisions can be finalized.")

        with transaction.atomic():
            decision.status = Decision.DecisionStatus.FINALIZED
            decision.finalized_at = timezone.now()
            
            # Generate decision number if not exists
            if not decision.decision_number:
                decision.decision_number = decision.generate_decision_number()
            
            decision.save()
            
            # Generate PDF
            generate_decision_pdf(decision)
            
            # Notify Registrar
            registrars = User.objects.filter(role='REGISTRAR')
            for reg in registrars:
                create_notification(
                    user=reg,
                    type='DECISION_FINALIZED',
                    title='Decision Finalized for Review',
                    message=f'Judge {user.get_full_name()} has finalized a decision for case {decision.case.file_number}. Please review.',
                    case=decision.case,
                    action_url=f"/decisions/{decision.id}"
                )
                
        return decision

    @staticmethod
    def publish_decision(decision, user):
        """
        Publishes a decision, notifies parties, and closes the case.
        """
        if decision.status != Decision.DecisionStatus.FINALIZED:
            raise BusinessLogicError("Only finalized decisions can be published.")

        with transaction.atomic():
            decision.status = Decision.DecisionStatus.PUBLISHED
            decision.is_published = True
            decision.published_at = timezone.now()
            decision.save()
            
            # Update Case Status to CLOSED
            case = decision.case
            case.status = CaseStatus.CLOSED
            case.save()
            
            # Deliver to parties
            deliver_decision(decision)
            
            # Log and trigger notifications for parties already handled by deliver_decision
            
        return decision

    @staticmethod
    def acknowledge_receipt(decision, user):
        """
        Acknowledges receipt of a published decision by a party.
        """
        if decision.status != Decision.DecisionStatus.PUBLISHED:
            raise BusinessLogicError("Only published decisions can be acknowledged.")
            
        delivery = DecisionDelivery.objects.filter(decision=decision, recipient=user).first()
        if not delivery:
            raise BusinessLogicError("No delivery record found for this user.")
            
        delivery.acknowledged_at = timezone.now()
        delivery.save()
        return delivery

    @staticmethod
    def file_appeal(decision, user, reasons):
        """
        Files an appeal for a published decision.
        """
        if decision.status != Decision.DecisionStatus.PUBLISHED:
            raise BusinessLogicError("Only published decisions can be appealed.")
            
        # Check if user is a party to the case
        case = decision.case
        is_party = user in [case.created_by, case.plaintiff, case.defendant, case.plaintiff_lawyer, case.defendant_lawyer]
        if not is_party:
            raise BusinessLogicError("Only parties to the case can file an appeal.")

        appeal = DecisionAppeal.objects.create(
            decision=decision,
            appellant=user,
            reasons=reasons
        )
        return appeal

    @staticmethod
    def add_comment(decision, user, text):
        """
        Adds a comment during review.
        """
        if user.role not in ['JUDGE', 'REGISTRAR', 'ADMIN']:
            raise BusinessLogicError("Only court officials can comment on decisions.")
            
        comment = DecisionComment.objects.create(
            decision=decision,
            author=user,
            text=text
        )
        return comment


def generate_decision_pdf(decision):
    """
    Generate professional PDF for decision including case details, hearings, and evidence.
    """
    try:
        case = decision.case
        
        # Get hearings for this case
        hearings = Hearing.objects.filter(case=case, status='COMPLETED').order_by('scheduled_date')
        
        # Get documents (evidence) for this case
        evidence = CaseDocument.objects.filter(case=case, document_type='EVIDENCE')
        
        # Render HTML template
        context = {
            'decision': decision,
            'case': case,
            'judge': decision.judge,
            'court_name': case.court_name or 'Federal High Court',
            'hearings': hearings,
            'evidence': evidence,
            'date': decision.finalized_at.strftime('%B %d, %Y') if decision.finalized_at else timezone.now().strftime('%B %d, %Y'),
            'signature_placeholder': "____________________"
        }
        
        html_string = render_to_string('decisions/decision_professional.html', context)
        
        # Generate PDF
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        # Save PDF
        filename = f"Decision_{case.file_number or case.id}.pdf"
        decision.pdf_document.save(filename, ContentFile(pdf_file), save=True)
        
        logger.info(f"Professional PDF generated for decision {decision.decision_number}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to generate professional PDF for decision {decision.decision_number}: {str(e)}")
        # Log full traceback for debugging if needed
        import traceback
        logger.error(traceback.format_exc())
        return False


def deliver_decision(decision):
    """
    Deliver decision to all parties
    """
    parties = [
        decision.case.created_by,
        decision.case.plaintiff,
        decision.case.defendant,
        decision.case.plaintiff_lawyer,
        decision.case.defendant_lawyer
    ]
    
    # Remove None values and duplicates
    parties = list(set(filter(None, parties)))
    
    for party in parties:
        try:
            # Create delivery record
            delivery = DecisionDelivery.objects.create(
                decision=decision,
                recipient=party,
                method='EMAIL'
            )
            
            # Send email
            send_decision_email(decision, party)
            
            # Create notification
            create_notification(
                user=party,
                type='DECISION_ISSUED',
                title='Decision Issued',
                message=f'A decision has been issued for your case. Decision Number: {decision.decision_number}',
                case=decision.case,
                action_url=f"/decisions/{decision.id}"
            )
            
            logger.info(f"Decision {decision.decision_number} delivered to {party.email}")
            
        except Exception as e:
            logger.error(f"Failed to deliver decision to {party.email}: {str(e)}")


def send_decision_email(decision, recipient):
    """
    Send decision notification email
    """
    context = {
        'recipient': recipient,
        'decision': decision,
        'case': decision.case,
        'frontend_url': settings.FRONTEND_URL
    }
    
    return send_email_template(
        subject=f"Decision Issued - {decision.case.file_number}",
        template_name='emails/decision_issued.html',
        context=context,
        recipient_list=[recipient.email]
    )


def check_decision_acknowledgments():
    """
    Check and update decision acknowledgments
    """
    from django.utils import timezone
    from datetime import timedelta
    
    # Mark as acknowledged after 7 days if no response
    seven_days_ago = timezone.now() - timedelta(days=7)
    
    unacknowledged = DecisionDelivery.objects.filter(
        acknowledged_at__isnull=True,
        delivered_at__lte=seven_days_ago
    )
    
    for delivery in unacknowledged:
        delivery.acknowledged_at = delivery.delivered_at + timedelta(days=7)
        delivery.save()
        logger.info(f"Auto-acknowledged decision delivery {delivery.id}")