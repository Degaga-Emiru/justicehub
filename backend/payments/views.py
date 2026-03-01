from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from .serializers import PaymentSubmissionSerializer, PaymentSerializer
from .services import PaymentService

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
