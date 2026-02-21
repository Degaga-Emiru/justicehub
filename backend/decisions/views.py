from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Decision, DecisionDelivery
from .serializers import (
    DecisionSerializer, DecisionDeliverySerializer,
    DecisionPublishSerializer
)
from cases.permissions import IsJudge, IsAssignedJudge
from notifications.services import create_notification, notify_case_participants
from .services import generate_decision_pdf, deliver_decision


class DecisionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing decisions
    """
    serializer_class = DecisionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'ADMIN':
            return Decision.objects.all()
        elif user.role == 'JUDGE':
            return Decision.objects.filter(judge=user)
        else:
            # Clients can see decisions for their cases
            return Decision.objects.filter(case__created_by=user)
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsJudge, IsAssignedJudge]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        decision = serializer.save()
        
        # Generate PDF
        generate_decision_pdf(decision)
        
        logger.info(f"Decision {decision.decision_number} created for case {decision.case.file_number}")
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        Publish a decision
        """
        decision = self.get_object()
        
        serializer = DecisionPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if decision.is_published:
            return Response(
                {"error": "Decision is already published."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        decision.is_published = True
        decision.published_at = timezone.now()
        decision.save()
        
        # Deliver to parties
        deliver_decision(decision)
        
        # Notify all parties
        notify_case_participants(
            case=decision.case,
            type='DECISION_ISSUED',
            title='Decision Issued',
            message=f'A decision has been issued for your case. Decision Number: {decision.decision_number}',
            exclude_users=[request.user]
        )
        
        return Response({
            "message": "Decision published successfully.",
            "decision_number": decision.decision_number
        })
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Download decision PDF
        """
        decision = self.get_object()
        
        if not decision.pdf_document:
            return Response(
                {"error": "PDF document not available."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            decision.pdf_document.open('rb'),
            as_attachment=True,
            filename=f"Decision_{decision.decision_number}.pdf"
        )
    
    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        """
        Get delivery status for decision
        """
        decision = self.get_object()
        deliveries = decision.deliveries.all()
        serializer = DecisionDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)


class PublishDecisionView(generics.UpdateAPIView):
    """
    View for publishing decisions
    """
    queryset = Decision.objects.filter(is_published=False)
    serializer_class = DecisionSerializer
    permission_classes = [IsAuthenticated, IsJudge]
    
    def patch(self, request, *args, **kwargs):
        decision = self.get_object()
        
        if request.user != decision.judge:
            return Response(
                {"error": "Only the issuing judge can publish this decision."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        decision.is_published = True
        decision.published_at = timezone.now()
        decision.save()
        
        # Deliver to parties
        from .services import deliver_decision
        deliver_decision(decision)
        
        return Response(self.get_serializer(decision).data)


class DownloadDecisionPDFView(generics.RetrieveAPIView):
    """
    View for downloading decision PDF
    """
    queryset = Decision.objects.filter(is_published=True)
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, *args, **kwargs):
        decision = self.get_object()
        
        if not decision.pdf_document:
            return Response(
                {"error": "PDF document not available."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            decision.pdf_document.open('rb'),
            as_attachment=True,
            filename=f"Decision_{decision.decision_number}.pdf"
        )