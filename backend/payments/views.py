from rest_framework import status, generics, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from .serializers import PaymentSerializer
from .services import PaymentService
from .models import Payment

class PaymentInitiateView(views.APIView):
    """Initializes a Chapa payment for a case"""
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        try:
            payment = PaymentService.initiate_payment(case_id, request.user)
            return Response({
                "message": "Payment initialized successfully",
                "data": {
                    "case_id": str(payment.case.id),
                    "amount": float(payment.amount),
                    "tx_ref": payment.tx_ref,
                    "payment_url": payment.payment_url
                }
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to initialize payment."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny

class PaymentCallbackView(views.APIView):
    """Callback from Chapa after payment"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        tx_ref = request.query_params.get('tx_ref') or request.query_params.get('trx_ref')
        if not tx_ref:
            return Response({"error": "tx_ref is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify and complete
        payment = PaymentService.verify_and_complete_payment(tx_ref)
        if payment and payment.status == Payment.Status.SUCCESS:
            return Response({"status": "ok", "message": "Payment successful"})
        return Response({"status": "failed", "message": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

class PaymentVerifyView(views.APIView):
    """Manually verify a payment by its reference"""
    permission_classes = [IsAuthenticated]

    def get(self, request, tx_ref):
        payment = PaymentService.verify_and_complete_payment(tx_ref)
        if not payment:
            return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "tx_ref": payment.tx_ref,
            "status": payment.status,
            "amount": float(payment.amount),
            "case_id": str(payment.case.id)
        })

class PaymentByCaseView(views.APIView):
    """Get payment details for a specific case"""
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        payment = get_object_or_404(Payment, case_id=case_id)
        serializer = PaymentSerializer(payment)
        return Response({
            "case_id": str(payment.case.id),
            "payment": serializer.data
        })

class PaymentRetryView(views.APIView):
    """Regenerates a payment link if previous failed"""
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        try:
            payment = PaymentService.initiate_payment(case_id, request.user)
            return Response({
                "message": "Payment link regenerated",
                "payment_url": payment.payment_url
            })
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PaymentListView(generics.ListAPIView):
    """Admin endpoint to list all payments"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Payment.objects.all().order_by('-created_at')
    serializer_class = PaymentSerializer

class IsRegistrarOrAdmin(IsAuthenticated):
    """Permission class for Registrars and Admins"""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request.user, 'role', '') in ['REGISTRAR', 'ADMIN', 'CLERK']

class ManualPaymentConfirmationView(views.APIView):
    """Endpoint for Registrars to confirm manual bank payments"""
    permission_classes = [IsRegistrarOrAdmin]

    def patch(self, request):
        from .serializers import ManualPaymentConfirmationSerializer
        serializer = ManualPaymentConfirmationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                payment = PaymentService.manual_confirm_payment(
                    case_id=serializer.validated_data['case_id'],
                    amount=serializer.validated_data['amount'],
                    reference_number=serializer.validated_data['reference_number'],
                    transaction_id=serializer.validated_data['transaction_id'],
                    registrar=request.user,
                    notes=serializer.validated_data.get('notes')
                )
                return Response({
                    "message": "Manual payment confirmed successfully",
                    "data": {
                        "case_id": str(payment.case.id),
                        "amount": float(payment.amount),
                        "status": payment.status,
                        "payment_method": payment.payment_method
                    }
                }, status=status.HTTP_200_OK)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({"error": "Failed to confirm manual payment."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
