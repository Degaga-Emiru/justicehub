from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from .serializers import PaymentSubmissionSerializer, PaymentSerializer, PaymentDetailSerializer
from .services import PaymentService
from .models import Payment
from cases.permissions import IsRegistrar


class PaymentSubmitView(generics.CreateAPIView):
    """
    API endpoint for users to submit bank transfer details for case payment.
    """
    serializer_class = PaymentSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            payment = PaymentService.submit_payment(
                case_id=serializer.validated_data['case_id'],
                user=request.user,
                data=serializer.validated_data
            )
            
            response_serializer = PaymentSerializer(payment)
            return Response({
                "message": "Payment details submitted and verified successfully.",
                "payment": response_serializer.data,
                "status": "PAID",
                "next_step": "Judge Assignment complete."
            }, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response(
                {"error": str(e.message) if hasattr(e, 'message') else str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred during payment processing."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentListView(generics.ListAPIView):
    """
    API endpoint for clerks/registrars to view all payments.
    Supports filtering by status via ?status=PENDING|VERIFIED|FAILED
    """
    serializer_class = PaymentDetailSerializer
    permission_classes = [IsAuthenticated, IsRegistrar]

    def get_queryset(self):
        qs = Payment.objects.all().select_related(
            'case', 'case__category', 'user'
        ).order_by('-created_at')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        return qs

class PaymentVerifyView(generics.UpdateAPIView):
    """
    API endpoint for clerks/registrars to verify a pending payment.
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsRegistrar]

    def update(self, request, *args, **kwargs):
        try:
            payment = self.get_object()
            PaymentService.verify_payment(payment.id, user=request.user)
            
            # Refresh from db to get updated status
            payment.refresh_from_db()
            serializer = self.get_serializer(payment)
            
            return Response({
                "message": "Payment verified successfully. Case moved to PAID and Judge assignment triggered.",
                "payment": serializer.data
            })
        except ValidationError as e:
            return Response(
                {"error": str(e.message) if hasattr(e, 'message') else str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
