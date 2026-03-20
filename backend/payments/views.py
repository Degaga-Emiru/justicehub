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
