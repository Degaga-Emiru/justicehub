from django.db import transaction, models
from django.db.models import Q
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML
from django.conf import settings
from .models import Decision, DecisionDelivery, DecisionVersion, DecisionComment
from notifications.services import create_notification
from cases.constants import CaseStatus
from cases.models import User, CaseDocument
from hearings.models import Hearing
from core.exceptions import BusinessLogicError
from core.utils.email import send_email_template
from core.cryptography import get_document_hash, sign_hash
from .pdf_utils import append_visual_signature
import logging
import os
import uuid

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
        Finalizes a decision, uses uploaded doc or generates PDF, closes case, and notifies parties.
        """
        if decision.status != Decision.DecisionStatus.DRAFT:
            raise BusinessLogicError("Only draft decisions can be finalized.")

        # Debug logging with case_id (using warning to ensure visibility in terminal)
        case_id = decision.case_id
        hearings = Hearing.objects.filter(case_id=case_id)
        logger.warning(f"DEBUG: Checking finalization for case {decision.case.file_number} (ID: {case_id}). Total hearings found: {hearings.count()}")
        
        for h in hearings:
            logger.warning(f"DEBUG: Hearing {h.id}: status='{h.status}', conducted_at={h.conducted_at}, completed_at={h.completed_at}")

        # Check for any hearing that has been conducted or completed using both string literals and TextChoices
        conducted_hearing_exists = hearings.filter(
            Q(status__in=['CONDUCTED', 'COMPLETED', Hearing.HearingStatus.CONDUCTED, Hearing.HearingStatus.COMPLETED]) |
            Q(conducted_at__isnull=False) |
            Q(completed_at__isnull=False)
        ).exists()
        
        if not conducted_hearing_exists:
            # Include more info in the error to help debug
            error_msg = "A decision cannot be finalized unless at least one hearing for the case has been conducted."
            logger.warning(f"Validation failed for case {case_id}: {error_msg}")
            raise BusinessLogicError(error_msg)

        with transaction.atomic():
            decision.status = Decision.DecisionStatus.FINALIZED
            decision.finalized_at = timezone.now()
            
            # Generate decision number if not exists
            if not decision.decision_number:
                decision.decision_number = decision.generate_decision_number()
            
            # Check if document is already uploaded
            if decision.document:
                logger.info(f"Using uploaded document for decision {decision.decision_number}")
            else:
                # Generate PDF if no document is attached
                logger.info(f"Generating PDF for decision {decision.decision_number}")
                generate_decision_pdf(decision)
                
                # Link generated PDF to CaseDocument for consistency
                if decision.pdf_document:
                    case_doc = CaseDocument.objects.create(
                        case=decision.case,
                        uploaded_by=decision.judge,
                        document_type=CaseDocument.DocumentType.JUDGMENT,
                        description=f"Generated Decision PDF for {decision.decision_number}"
                    )
                    
                    # File name for CaseDocumentVersion
                    import os
                    file_name = os.path.basename(decision.pdf_document.name)
                    
                    from cases.models import CaseDocumentVersion
                    CaseDocumentVersion.objects.create(
                        document=case_doc,
                        file=decision.pdf_document,
                        uploaded_by=decision.judge,
                        version_number=1,
                        status=CaseDocumentVersion.VersionStatus.APPROVED,
                        is_active=True,
                        file_name=file_name,
                        file_size=decision.pdf_document.size,
                        file_type='pdf' # Since it's generated as PDF
                    )
                    decision.document = case_doc

            decision.save()
            
            # Digital Signature Logic
            if decision.document:
                DecisionWorkflowService.sign_decision_document(decision, user)

            # Update Case Status to CLOSED
            case = decision.case
            case.status = CaseStatus.CLOSED
            case.save()

            # Notify parties (participants) only after finalization
            deliver_decision(decision)
            
            # Notify Registrar
            registrars = User.objects.filter(role='REGISTRAR')
            for reg in registrars:
                create_notification(
                    user=reg,
                    type='DECISION_FINALIZED',
                    title='Decision Finalized and Case Closed',
                    message=f'Judge {user.get_full_name()} has finalized a decision and closed case {decision.case.file_number}.',
                    case=decision.case,
                    action_url=f"/decisions/{decision.id}"
                )
                
        return decision

    @staticmethod
    def sign_decision_document(decision, user):
        """
        Calculates hash and signs the decision document.
        """
        if not decision.document:
            # Fallback to pdf_document if document object is missing (newly generated)
            if not decision.pdf_document:
                raise BusinessLogicError("No document found to sign.")
            
            from cases.models import CaseDocument, CaseDocumentVersion
            # Double check if case_doc was created but not linked
            case_doc = CaseDocument.objects.filter(
                case=decision.case, 
                document_type=CaseDocument.DocumentType.JUDGMENT,
                uploaded_by=decision.judge
            ).order_by('-uploaded_at').first()
            
            if not case_doc:
                case_doc = CaseDocument.objects.create(
                    case=decision.case,
                    uploaded_by=decision.judge,
                    document_type=CaseDocument.DocumentType.JUDGMENT,
                    description=f"Decision PDF for {decision.decision_number}"
                )
                
                CaseDocumentVersion.objects.create(
                    document=case_doc,
                    file=decision.pdf_document,
                    uploaded_by=decision.judge,
                    version_number=1,
                    status=CaseDocumentVersion.VersionStatus.APPROVED,
                    is_active=True,
                    file_name=os.path.basename(decision.pdf_document.name),
                    file_size=decision.pdf_document.size,
                    file_type='pdf'
                )
            
            decision.document = case_doc
            decision.save()

        active_version = decision.document.get_active_version()
        if not active_version or not active_version.file:
            raise BusinessLogicError("Active document version file not found.")
            
        file_path = active_version.file.path
        
        # 1. Add Visual Signature Box BEFORE hashing
        signature_id = f"SIG-{uuid.uuid4().hex[:8].upper()}"
        date_signed = timezone.now().strftime('%Y-%m-%d %H:%M')
        judge_name = user.get_full_name()
        
        try:
            append_visual_signature(
                file_path,
                file_path,  # Overwrite existing file with signed version
                judge_name,
                date_signed,
                signature_id
            )
            logger.info(f"Visual signature box appended to {file_path}")
        except Exception as e:
            logger.error(f"Failed to append visual signature box: {str(e)}")
            # Continue with signing even if visual box fails, or should we raise?
            # User requirement says it MUST appear, so maybe raise error.
            raise BusinessLogicError(f"Failed to add visual signature: {str(e)}")

        # 2. Calculate Hash of the document (now including the visual box)
        doc_hash = get_document_hash(file_path)
        
        # 3. Sign Hash
        signature = sign_hash(doc_hash)
        
        # 4. Update CaseDocument fields
        doc = decision.document
        doc.document_hash = doc_hash
        doc.digital_signature = signature
        doc.signature_algorithm = 'RSA-SHA256'
        doc.signed_at = timezone.now()
        doc.is_signed = True
        doc.signed_by = user
        doc.signature_verified = True # Just signed, so it's verified
        doc.save()
        
        logger.info(f"Decision {decision.decision_number} digitally signed by {user.email}")
        return doc

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
            
            # Deliver to parties - ALREADY HANDLED AT FINALIZATION
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

    @staticmethod
    def create_immediate_decision(case, judge, reason, description):
        """
        Creates an immediate decision, closes the case, and notifies parties.
        """
        # 1. Validation for any hearing that has been conducted or completed
        conducted_hearing_exists = Hearing.objects.filter(
            case=case
        ).filter(
            Q(status__in=[Hearing.HearingStatus.CONDUCTED, Hearing.HearingStatus.COMPLETED]) |
            Q(conducted_at__isnull=False) |
            Q(completed_at__isnull=False)
        ).exists()
        
        if not conducted_hearing_exists:
            raise BusinessLogicError("An immediate decision cannot be issued unless at least one hearing for the case has been conducted.")

        with transaction.atomic():
            # 2. Create Decision
            decision = Decision.objects.create(
                case=case,
                judge=judge,
                title=f"Immediate Decision - {case.file_number}",
                decision_type=Decision.DecisionType.IMMEDIATE,
                immediate_reason=reason,
                description=description,
                status=Decision.DecisionStatus.FINALIZED,
                finalized=True,
                finalized_at=timezone.now()
            )
            
            # Generate decision number
            decision.decision_number = decision.generate_decision_number()
            decision.save()

            # 3. Close Case
            case.status = CaseStatus.CLOSED
            case.save()

            # 4. Notify parties
            deliver_decision(decision)
            
            # Notify Registrar
            registrars = User.objects.filter(role='REGISTRAR')
            for reg in registrars:
                create_notification(
                    user=reg,
                    type='DECISION_FINALIZED',
                    title='Immediate Decision Issued',
                    message=f'Judge {judge.get_full_name()} has issued an immediate decision for case {case.file_number}. Reason: {decision.get_immediate_reason_display()}',
                    case=case,
                    action_url=f"/decisions/{decision.id}"
                )
        
        return decision


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