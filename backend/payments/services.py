import logging
import uuid
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from cases.models import Case
from cases.constants import CaseStatus
from cases.services import JudgeAssignmentService
from notifications.services import create_notification
from core.utils.email import send_email_template
from .models import Payment, Transaction
import json
import requests
from decimal import Decimal

# One logger is enough
logger = logging.getLogger(__name__)

class ChapaService:
    """Service to interact with Chapa Payment API"""
    BASE_URL = "https://api.chapa.co/v1"
    SECRET_KEY = getattr(settings, 'CHAPA_SECRET_KEY', None)

    @classmethod
    def _get_headers(cls):
        return {
            "Authorization": f"Bearer {cls.SECRET_KEY}",
            "Content-Type": "application/json"
        }

    @classmethod
    def initialize_transaction(cls, amount, email, first_name, last_name, tx_ref, callback_url, description="Case Payment"):
        """Initialize a transaction with Chapa"""
        endpoint = f"{cls.BASE_URL}/transaction/initialize"
        payload = {
            "amount": str(amount),
            "currency": "ETB",
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "tx_ref": tx_ref,
            "callback_url": callback_url,
            "customization": {
                "title": "JusticeHub",
                "description": description
            }
        }
        
        try:
            response = requests.post(endpoint, json=payload, headers=cls._get_headers(), timeout=15)
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get('status') == 'success':
                return response_data['data']['checkout_url']
            else:
                logging.getLogger(__name__).error(f"Chapa initialization failed: {response_data}")
                raise ValidationError(f"Chapa Error: {response_data.get('message', 'Unknown error')}")
        except requests.RequestException as e:
            logging.getLogger(__name__).error(f"Chapa API Request Error: {str(e)}")
            raise ValidationError("Failed to connect to Chapa Payment Gateway.")

    @classmethod
    def verify_transaction(cls, tx_ref):
        """Verify a transaction with Chapa"""
        endpoint = f"{cls.BASE_URL}/transaction/verify/{tx_ref}"
        
        try:
            response = requests.get(endpoint, headers=cls._get_headers(), timeout=15)
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get('status') == 'success':
                return response_data['data']
            else:
                logging.getLogger(__name__).error(f"Chapa verification failed for {tx_ref}: {response_data}")
                return None
        except requests.RequestException as e:
            logging.getLogger(__name__).error(f"Chapa API Verification Error: {str(e)}")
            return None


class PaymentService:
    @staticmethod
    @transaction.atomic
    def initiate_payment(case_id, user):
        """Initializes a Chapa payment for a case"""
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            raise ValidationError("Case not found.")

        # 1. Validation
        if case.status != CaseStatus.APPROVED:
            raise ValidationError(f"Payment can only be initialized for APPROVED cases. Current: {case.status}")
        
        if Payment.objects.filter(case=case, status=Payment.Status.SUCCESS).exists():
            raise ValidationError("This case has already been paid successfully.")

        # 2. Setup Reference and Amount
        tx_ref = f"CASE-{case.id}-{uuid.uuid4().hex[:6].upper()}"
        amount = case.category.fee
        
        # 3. Sanitize description for Chapa (No special chars except common ones)
        import re
        case_title = case.file_number or case.title
        clean_title = re.sub(r'[^a-zA-Z0-9\s\.\_\-]', '', str(case_title))
        description = f"Payment for Case {clean_title}"[:100]

        # 4. Call Chapa to initialize
        callback_url = f"{settings.BACKEND_URL}/api/payments/callback/"
        checkout_url = ChapaService.initialize_transaction(
            amount=amount,
            email=user.email,
            first_name=user.first_name or "Citizen",
            last_name=user.last_name or "User",
            tx_ref=tx_ref,
            callback_url=callback_url,
            description=description
        )

        # 4. Create/Update Payment record
        payment, created = Payment.objects.update_or_create(
            case=case,
            user=user,
            defaults={
                'amount': amount,
                'tx_ref': tx_ref,
                'payment_url': checkout_url,
                'status': Payment.Status.PENDING,
                'payment_method': 'CHAPA'
            }
        )

        # 5. Send Email with payment link
        PaymentService._send_payment_required_email(payment)
        
        return payment

    @staticmethod
    @transaction.atomic
    def verify_and_complete_payment(tx_ref):
        """Verifies Chapa payment and updates case status"""
        try:
            payment = Payment.objects.select_related('case', 'user', 'case__category').get(tx_ref=tx_ref)
        except Payment.DoesNotExist:
            logging.getLogger(__name__).error(f"Verification failed: Payment with tx_ref {tx_ref} not found.")
            return None

        if payment.status in [Payment.Status.SUCCESS, Payment.Status.VERIFIED]:
            return payment

        # 1. Verify with Chapa
        verification_data = ChapaService.verify_transaction(tx_ref)
        if not verification_data or verification_data.get('status') != 'success':
            payment.status = Payment.Status.FAILED
            payment.save()
            return payment

        # 2. Security Check: Verify amount and currency
        verified_amount = Decimal(str(verification_data.get('amount')))
        if verified_amount != payment.amount:
            logging.getLogger(__name__).error(f"Security Alert: Amount mismatch for {tx_ref}. Expected {payment.amount}, got {verified_amount}")
            payment.status = Payment.Status.FAILED
            payment.notes = f"Amount mismatch. Expected {payment.amount}, got {verified_amount}"
            payment.save()
            return payment

        # 3. Success Workflow
        payment.status = Payment.Status.SUCCESS
        payment.chapa_transaction_id = verification_data.get('reference')
        payment.paid_at = timezone.now()
        payment.save()

        # Update Case Status
        case = payment.case
        case.status = CaseStatus.PAID
        case.save()

        # Audit/Transaction Record
        Transaction.objects.update_or_create(
            payment=payment,
            defaults={
                'amount': payment.amount,
                'chapa_transaction_id': payment.chapa_transaction_id,
                'details': verification_data
            }
        )

        # Notifications
        create_notification(
            user=payment.user,
            type='PAYMENT_RECEIVED',
            title='Payment Received',
            message=f"Thank you. Your payment for case {case.file_number} has been verified.",
            case=case
        )
        
        # Email Confirmation
        PaymentService._send_confirmation_email(payment)

        # Auto Assign Judge
        JudgeAssignmentService.assign_judge(case)

        return payment

    @staticmethod
    def _send_payment_required_email(payment):
        """Send email with payment link after case approval"""
        context = {
            'user': payment.user,
            'case': payment.case,
            'payment_url': payment.payment_url,
            'amount': payment.amount,
            'frontend_url': settings.FRONTEND_URL
        }
        send_email_template(
            subject=f"Action Required: Payment for Case {payment.case.file_number}",
            template_name='emails/payment_required.html',
            context=context,
            recipient_list=[payment.user.email]
        )

    @staticmethod
    def _send_confirmation_email(payment):
        """Send payment confirmation email"""
        context = {
            'user': payment.user,
            'payment': payment,
            'case': payment.case,
            'frontend_url': settings.FRONTEND_URL
        }
        send_email_template(
            subject=f"Payment Confirmation - {payment.case.file_number}",
            template_name='emails/payment_confirmation.html',
            context=context,
            recipient_list=[payment.user.email]
        )
