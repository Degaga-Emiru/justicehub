from rest_framework import viewsets, status, generics, pagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta

from .models import Decision, DecisionDelivery
from .serializers import (
    DecisionSerializer, DecisionDeliverySerializer,
    DecisionPublishSerializer
)
from .permissions import (
    IsDecisionJudge, CanPublishDecision, CanViewDecision,
    IsPartyToDecision
)
from .services import generate_decision_pdf, deliver_decision
from audit_logs.services import create_log
from audit_logs.models import UserActionLog
from notifications.services import create_notification, notify_case_participants
from core.exceptions import BusinessLogicError
import logging

logger = logging.getLogger(__name__)


class DecisionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing decisions.
    """
    queryset = Decision.objects.all().select_related(
        'case', 'judge'
    ).prefetch_related('deliveries__recipient')
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        return DecisionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['ADMIN', 'CLERK', 'REGISTRAR']:
            return self.queryset
        elif user.role == 'JUDGE':
            return self.queryset.filter(judge=user)
        else:
            # Clients see decisions for their cases
            return self.queryset.filter(
                Q(case__created_by=user) |
                Q(case__plaintiff=user) |
                Q(case__defendant=user) |
                Q(case__plaintiff_lawyer=user) |
                Q(case__defendant_lawyer=user)
            ).distinct()
    
    def get_permissions(self):
        if self.action in ['create']:
            self.permission_classes = [IsAuthenticated, IsDecisionJudge]
        elif self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsDecisionJudge]
        elif self.action in ['retrieve']:
            self.permission_classes = [IsAuthenticated, CanViewDecision]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        return serializer.save()
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = self.perform_create(serializer)
        
        # Generate PDF
        generate_decision_pdf(decision)
        
        # Log Decision Creation
        create_log(
            request=request,
            action_type=UserActionLog.ActionType.DECISION,
            obj=decision,
            description=f"Decision {decision.decision_number} issued for case {decision.case.file_number}."
        )

        logger.info(f"Decision {decision.decision_number} created for case {decision.case.id}")
        
        return Response({
            "id": decision.id,
            "decision_number": decision.decision_number,
            "case": decision.case.id,
            "title": decision.title,
            "decision_type": decision.decision_type,
            "judge_name": decision.judge.get_full_name(),
            "is_published": decision.is_published,
            "created_at": decision.created_at
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanPublishDecision])
    def publish(self, request, pk=None):
        """Publish a decision"""
        decision = self.get_object()
        
        serializer = DecisionPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if decision.is_published:
            raise BusinessLogicError("Decision is already published")
        
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
            "decision_number": decision.decision_number,
            "published_at": decision.published_at
        })
    
    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        """Download decision PDF"""
        decision = self.get_object()
        
        if not decision.pdf_document:
            return Response(
                {"error": "PDF document not available"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            decision.pdf_document.open('rb'),
            as_attachment=True,
            filename=f"Decision_{decision.decision_number}.pdf"
        )
    
    @action(detail=True, methods=['get'], url_path='deliveries')
    def deliveries(self, request, pk=None):
        """Get decision deliveries"""
        decision = self.get_object()
        deliveries = decision.deliveries.all()
        serializer = DecisionDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPartyToDecision], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        """Acknowledge receipt of decision"""
        decision = self.get_object()
        
        delivery = get_object_or_404(
            DecisionDelivery,
            decision=decision,
            recipient=request.user
        )
        
        delivery.acknowledged_at = timezone.now()
        delivery.save()
        
        return Response({
            "message": "Decision acknowledged",
            "acknowledged_at": delivery.acknowledged_at
        })
    
    @action(detail=False, methods=['get'])
    def published(self, request):
        """Get published decisions"""
        decisions = self.get_queryset().filter(is_published=True)
        page = self.paginate_queryset(decisions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent decisions"""
        days = int(request.query_params.get('days', 30))
        cutoff = timezone.now() - timedelta(days=days)
        
        decisions = self.get_queryset().filter(
            created_at__gte=cutoff
        ).order_by('-created_at')[:20]
        
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)


class BulkPublishDecisionsView(generics.GenericAPIView):
    """View for bulk publishing decisions"""
    permission_classes = [IsAuthenticated, IsDecisionJudge]
    
    def post(self, request):
        decision_ids = request.data.get('decision_ids', [])
        
        results = []
        for decision_id in decision_ids:
            try:
                decision = Decision.objects.get(id=decision_id, judge=request.user)
                decision.is_published = True
                decision.published_at = timezone.now()
                decision.save()
                
                deliver_decision(decision)
                
                results.append({
                    'decision_id': decision_id,
                    'status': 'success',
                    'decision_number': decision.decision_number
                })
            except Decision.DoesNotExist:
                results.append({
                    'decision_id': decision_id,
                    'status': 'failed',
                    'error': 'Decision not found or permission denied'
                })
            except Exception as e:
                results.append({
                    'decision_id': decision_id,
                    'status': 'failed',
                    'error': str(e)
                })
        
        return Response(results)


class MonthlyDecisionsReportView(generics.GenericAPIView):
    """View for monthly decisions report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        start_date = timezone.datetime(year, month, 1)
        if month == 12:
            end_date = timezone.datetime(year + 1, 1, 1)
        else:
            end_date = timezone.datetime(year, month + 1, 1)
        
        decisions = Decision.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date
        )
        
        report = {
            'year': year,
            'month': month,
            'total_decisions': decisions.count(),
            'published': decisions.filter(is_published=True).count(),
            'by_type': decisions.values('decision_type').annotate(count=Count('id')),
            'by_judge': decisions.values(
                'judge__first_name', 'judge__last_name'
            ).annotate(count=Count('id')),
            'avg_processing_time': decisions.filter(
                is_published=True
            ).annotate(
                processing_time=models.Avg('published_at - created_at')
            ).values('processing_time')
        }
        
        return Response(report)


class JudgeDecisionPerformanceView(generics.GenericAPIView):
    """View for judge decision performance"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        judges = User.objects.filter(role='JUDGE')
        
        data = []
        for judge in judges:
            decisions = Decision.objects.filter(judge=judge)
            published = decisions.filter(is_published=True)
            
            data.append({
                'judge_id': judge.id,
                'judge_name': judge.get_full_name(),
                'total_decisions': decisions.count(),
                'published': published.count(),
                'pending': decisions.filter(is_published=False).count(),
                'avg_time_to_publish': published.filter(
                    published_at__isnull=False
                ).annotate(
                    avg_time=models.Avg('published_at - created_at')
                ).values('avg_time').first()
            })
        
        return Response(data)
