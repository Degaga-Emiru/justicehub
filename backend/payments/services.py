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
from core.utils.sms import send_sms
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog
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
    def initialize_transaction(cls, amount, email, first_name, last_name, tx_ref, callback_url, return_url=None, description="Case Payment"):
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
        if return_url:
            payload["return_url"] = return_url
            
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
        # NOTE: tx_ref MUST be appended to the return_url so the success page
        # can call verify_and_complete_payment automatically (no manual verification).
        callback_url = f"{settings.BACKEND_URL}/api/payments/callback/"
        return_url = f"{settings.FRONTEND_URL}/dashboard/client/payment-success/?tx_ref={tx_ref}&case_id={case.id}"
        checkout_url = ChapaService.initialize_transaction(
            amount=amount,
            email=user.email,
            first_name=user.first_name or "Citizen",
            last_name=user.last_name or "User",
            tx_ref=tx_ref,
            callback_url=callback_url,
            return_url=return_url,
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
        
        # 6. Audit Log
        create_audit_log(
            action_type=AuditLog.ActionType.PAYMENT_INITIATED,
            obj=payment,
            description=f"Payment of ETB {amount} initiated for Case {case.file_number}",
            user=user,
            entity_name=payment.tx_ref
        )
        
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

        # Update Case Status and Payment Status
        case = payment.case
        case.status = CaseStatus.PAID
        case.payment_status = 'PAID'
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
            title='Payment Received & Judge Assigned',
            message=(
                f"Your Chapa payment of ETB {payment.amount} for case '{case.title}' "
                f"(File No: {case.file_number}) has been verified and confirmed. "
                f"Your case is now progressing to the judge assignment stage. "
                f"You will receive another notification once a judge is assigned."
            ),
            case=case
        )
        
        # Email Confirmation
        PaymentService._send_confirmation_email(payment)

        # Audit Log
        create_audit_log(
            action_type=AuditLog.ActionType.PAYMENT_COMPLETED,
            obj=payment,
            description=f"Chapa payment of ETB {payment.amount} verified and completed",
            user=payment.user,
            entity_name=payment.tx_ref
        )

        # Trigger automatic judge assignment
        try:
            from cases.services import JudgeAssignmentService
            JudgeAssignmentService.assign_judge(case)
        except Exception as e:
            logging.getLogger(__name__).error(f"Automatic judge assignment failed after payment: {str(e)}")
            # Fail gracefully, registrar can manually assign if needed.

        return payment

    @staticmethod
    @transaction.atomic
    def submit_bank_transfer(case_id, user, transaction_reference, sender_name, bank_name, transaction_date=None, amount=None):
        """Citizens submit bank transfer proof — creates a PENDING payment for registrar review"""
        try:
            case = Case.objects.select_related('category').get(id=case_id)
        except Case.DoesNotExist:
            raise ValidationError("Case not found.")

        if case.status != CaseStatus.APPROVED:
            raise ValidationError(f"Payment can only be submitted for APPROVED cases. Current status: {case.status}")

        if Payment.objects.filter(case=case, status=Payment.Status.SUCCESS).exists():
            raise ValidationError("This case has already been paid successfully.")

        fee = case.category.fee
        payment_amount = amount if amount else fee

        payment, created = Payment.objects.update_or_create(
            case=case,
            defaults={
                'user': user,
                'amount': payment_amount,
                'tx_ref': transaction_reference,
                'status': Payment.Status.PENDING,
                'payment_method': 'BANK_TRANSFER',
                'notes': f"Bank: {bank_name} | Sender: {sender_name} | Date: {transaction_date or 'N/A'}",
            }
        )

        # Case stays APPROVED with payment_status=NOT_PAID until registrar confirms the transfer

        # Notify registrars that a payment needs verification
        from accounts.models import User
        registrars = User.objects.filter(role='REGISTRAR', is_active=True)
        for registrar in registrars:
            create_notification(
                user=registrar,
                type='PAYMENT_RECEIVED',
                title='Bank Transfer Submitted',
                message=f"Citizen {user.get_full_name()} submitted bank transfer proof for case {case.file_number or case.title}. Reference: {transaction_reference}. Please verify.",
                case=case
            )

        # Audit Log
        create_audit_log(
            action_type=AuditLog.ActionType.PAYMENT_INITIATED,
            obj=payment,
            description=f"Bank transfer proof submitted for {payment_amount} ETB. Ref: {transaction_reference}",
            user=user,
            entity_name=payment.tx_ref
        )

        # Notify client via SMS about their submission
        if user.phone_number:
            client_sms = (
                f"JusticeHub: Your bank transfer details for case '{case.title[:30]}' "
                f"(File No: {case.file_number}) have been received. "
                f"Bank: {bank_name}, Ref: {transaction_reference}, Amount: ETB {payment_amount}. "
                f"A registrar will verify your payment shortly. "
                f"You will be notified once verification is complete and a judge is assigned."
            )
            send_sms(user.phone_number, client_sms)

        # Notify registrars via SMS about pending verification
        from accounts.models import User as UserModel
        registrar_sms_targets = UserModel.objects.filter(role='REGISTRAR', is_active=True, phone_number__isnull=False).exclude(phone_number='')
        for registrar in registrar_sms_targets:
            reg_sms = (
                f"JusticeHub Alert: {user.get_full_name()} has submitted bank transfer proof "
                f"for case '{case.title[:30]}' (File No: {case.file_number}). "
                f"Bank: {bank_name}, Ref: {transaction_reference}, Amount: ETB {payment_amount}. "
                f"Please log in to the Registrar portal and verify this payment to proceed with judge assignment."
            )
            send_sms(registrar.phone_number, reg_sms)


        return payment

    @staticmethod
    @transaction.atomic
    def manual_confirm_payment(case_id, amount, reference_number, transaction_id, registrar, notes=None):
        """Manually confirms payment by a registrar for bank transfers"""
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            raise ValidationError("Case not found.")

        if case.status != CaseStatus.APPROVED:
            raise ValidationError(f"Manual payment can only be confirmed for APPROVED cases. Current: {case.status}")

        # Requirement: Validate that the amount exactly matches the category fee
        expected_fee = case.category.fee
        if Decimal(str(amount)) != expected_fee:
            raise ValidationError(
                f"Incorrect payment amount. The required fee for category '{case.category.name}' "
                f"is {expected_fee} ETB. You provided {amount} ETB."
            )

        # 1. Create/Update Payment record
        payment, created = Payment.objects.update_or_create(
            case=case,
            defaults={
                'user': case.created_by,
                'amount': amount,
                'tx_ref': reference_number,
                'status': Payment.Status.SUCCESS,
                'payment_method': 'MANUAL',
                'paid_at': timezone.now(),
                'notes': f"Manual confirmation by Registrar {registrar.get_full_name()} ({registrar.email}). {notes or ''}"
            }
        )

        # 2. Update Case Status
        case.status = CaseStatus.PAID
        case.payment_status = 'PAID'
        case.save()

        # 3. Audit/Transaction Record
        Transaction.objects.update_or_create(
            payment=payment,
            defaults={
                'amount': amount,
                'transaction_id': transaction_id,
                'details': {
                    'confirmed_by': registrar.email,
                    'reference': reference_number,
                    'method': 'MANUAL'
                }
            }
        )

        # 4. Audit Log
        create_audit_log(
            action_type=AuditLog.ActionType.PAYMENT_VERIFIED,
            obj=payment,
            description=f"Manual payment confirmation for {amount} ETB",
            user=registrar,
            changes={
                'method': {'old': None, 'new': 'MANUAL'},
                'txn_id': {'old': None, 'new': transaction_id}
            },
            entity_name=payment.tx_ref
        )

        # 5. Notifications
        create_notification(
            user=case.created_by,
            type='PAYMENT_RECEIVED',
            title='Bank Transfer Payment Verified',
            message=(
                f"Your bank transfer payment of ETB {payment.amount} for case '{case.title}' "
                f"(File No: {case.file_number}) has been verified and confirmed by the Registrar "
                f"{registrar.get_full_name()}. Your case is now moving to judge assignment. "
                f"You will be notified as soon as a judge specializing in your case category is assigned."
            ),
            case=case
        )

        # Send SMS to client about verification
        if case.created_by.phone_number:
            sms_msg = (
                f"JusticeHub: Your bank transfer of ETB {payment.amount} for case '{case.title[:30]}' "
                f"(File No: {case.file_number}) has been verified by Registrar {registrar.get_full_name()}. "
                f"Your case is now moving to judge assignment. You will receive a notification when a judge is assigned."
            )
            send_sms(case.created_by.phone_number, sms_msg)

        # 6. Auto Assign Judge
        JudgeAssignmentService.assign_judge(case, assigned_by=registrar)

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
        
        # Send SMS notification
        if payment.user.phone_number:
            sms_msg = (
                f"JusticeHub Notice: Your case '{payment.case.title[:30]}' "
                f"(File No: {payment.case.file_number}) has been approved. "
                f"A filing fee of ETB {payment.amount} is required. "
                f"Log in to your JusticeHub account and click 'Pay Filing Fee' "
                f"to pay securely via Chapa or Bank Transfer. "
                f"For assistance, contact support."
            )
            send_sms(payment.user.phone_number, sms_msg)

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
        
        # Send SMS notification
        if payment.user.phone_number:
            sms_msg = (
                f"JusticeHub Payment Confirmed: Your payment of ETB {payment.amount} "
                f"for case '{payment.case.title[:30]}' (File No: {payment.case.file_number}) "
                f"has been successfully verified. Your case is now moving to judge assignment. "
                f"You will be notified when a judge is assigned to your case. "
                f"Thank you for using JusticeHub."
            )
            send_sms(payment.user.phone_number, sms_msg)
