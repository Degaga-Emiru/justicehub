import os
from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from weasyprint import HTML
from .models import Decision, DecisionDelivery
from notifications.services import create_notification
from core.utils.email import send_email_template
import logging

logger = logging.getLogger(__name__)


def generate_decision_pdf(decision):
    """
    Generate PDF for decision
    """
    try:
        # Render HTML template
        context = {
            'decision': decision,
            'case': decision.case,
            'judge': decision.judge,
            'court_name': decision.case.court_name or 'City Court',
            'date': decision.created_at.strftime('%B %d, %Y')
        }
        
        html_string = render_to_string('decisions/decision_template.html', context)
        
        # Generate PDF
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        # Save PDF
        filename = f"decision_{decision.decision_number}.pdf"
        decision.pdf_document.save(filename, ContentFile(pdf_file), save=True)
        
        logger.info(f"PDF generated for decision {decision.decision_number}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to generate PDF for decision {decision.decision_number}: {str(e)}")
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