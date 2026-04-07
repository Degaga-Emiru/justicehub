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

logger = logging.getLogger(__name__)

class PaymentService:
    @staticmethod
    @transaction.atomic
    def submit_payment(case_id, user, data):
        """
        Processes a manual bank transfer payment submission.
        """
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            raise ValidationError("Case not found.")

        # 1. Verify case status
        if case.status != CaseStatus.APPROVED:
            raise ValidationError(f"Payment cannot be submitted for cases with status: {case.status}")

        # 2. Prevent duplicate payments for the same reference
        if Payment.objects.filter(transaction_reference=data['transaction_reference']).exists():
            raise ValidationError("A payment with this transaction reference already exists.")

        # 3. Verify amount matches category fee
        required_amount = case.category.fee
        if float(data['amount']) != float(required_amount):
            raise ValidationError(f"Payment amount ({data['amount']}) does not match required fee ({required_amount}).")

        # 4. Create Payment record
        payment = Payment.objects.create(
            case=case,
            user=user,
            amount=data['amount'],
            transaction_reference=data['transaction_reference'],
            payment_method=data.get('payment_method', 'BANK_TRANSFER'),
            sender_name=data['sender_name'],
            bank_name=data['bank_name'],
            transaction_date=data['transaction_date'],
            status='PENDING'  # Needs manual verification by Clerk
        )

        # 5. Create Transaction audit record
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        Transaction.objects.create(
            payment=payment,
            transaction_id=txn_id,
            amount=payment.amount,
            details={
                'method': payment.payment_method,
                'bank': payment.bank_name,
                'sender': payment.sender_name
            }
        )

        # Leave case status as APPROVED (Awaiting Payment Verification)
        # Note: Do not change to PAID here, wait for verification.

        # 7. Create notification
        create_notification(
            user=user,
            type='PAYMENT_RECEIVED',
            title='Payment Successful',
            message=f"Your payment for case {case.file_number} has been received and verified.",
            case=case
        )

        # 8. Send confirmation email
        PaymentService._send_confirmation_email(payment)

        # Log action
        from cases.services import AuditService
        AuditService.log_action(
            user=user,
            action='PAYMENT_SUBMITTED',
            entity=payment,
            details={'reference': payment.transaction_reference, 'case_id': str(case_id)}
        )

        return payment

    @staticmethod
    @transaction.atomic
    def verify_payment(payment_id, user):
        """
        Clerk/Registrar verifies a pending payment.
        """
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            raise ValidationError("Payment not found.")

        if payment.status != 'PENDING':
            raise ValidationError(f"Payment is already {payment.status}.")

        payment.status = 'VERIFIED'
        payment.save()

        # Update case status
        case = payment.case
        case.status = CaseStatus.PAID
        case.save()

        # Trigger judge assignment
        JudgeAssignmentService.assign_judge(case)

        # Notify user (if needed we can trigger another notification here)
        return payment

    @staticmethod
    def _send_confirmation_email(payment):
        """Send payment confirmation email"""
        context = {
            'user': payment.user,
            'payment': payment,
            'frontend_url': settings.FRONTEND_URL
        }
        
        send_email_template(
            subject=f"Payment Confirmation - {payment.case.file_number}",
            template_name='emails/payment_confirmation.html',
            context=context,
            recipient_list=[payment.user.email]
        )
