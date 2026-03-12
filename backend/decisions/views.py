from rest_framework import viewsets, status, generics, pagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta

from .models import Decision, DecisionDelivery, DecisionVersion, DecisionComment, DecisionAppeal
from .serializers import (
    DecisionSerializer, DecisionDeliverySerializer,
    DecisionPublishSerializer, DecisionVersionSerializer,
    DecisionCommentSerializer, DecisionAppealSerializer
)
from .permissions import (
    IsDecisionJudge, CanPublishDecision, CanViewDecision,
    IsPartyToDecision
)
from .services import generate_decision_pdf, deliver_decision, DecisionWorkflowService
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog
from notifications.services import create_notification, notify_case_participants
from core.exceptions import BusinessLogicError
import logging

logger = logging.getLogger(__name__)


class DecisionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing decisions with workflow states (Draft, Finalized, Published).
    """
    queryset = Decision.objects.all().select_related(
        'case', 'judge'
    ).prefetch_related(
        'deliveries__recipient', 'versions', 'comments__author', 'appeals__appellant'
    )
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'publish':
            return DecisionPublishSerializer
        elif self.action == 'appeal':
            return DecisionAppealSerializer
        elif self.action == 'comments':
            return DecisionCommentSerializer
        return DecisionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['ADMIN', 'REGISTRAR']:
            return self.queryset
        elif user.role == 'JUDGE':
            # Judges see their own decisions (any state) and published decisions
            return self.queryset.filter(Q(judge=user) | Q(status=Decision.DecisionStatus.PUBLISHED)).distinct()
        else:
            # Clients/Parties see ONLY published decisions for their cases
            return self.queryset.filter(
                Q(status=Decision.DecisionStatus.PUBLISHED) &
                (
                    Q(case__created_by=user) |
                    Q(case__plaintiff=user) |
                    Q(case__defendant=user) |
                    Q(case__plaintiff_lawyer=user) |
                    Q(case__defendant_lawyer=user)
                )
            ).distinct()
    
    def get_permissions(self):
        """
        Assigns permissions based on action.
        """
        # Default: must be authenticated
        permission_classes = [IsAuthenticated]
        
        if self.action == 'create':
            permission_classes += [IsDecisionJudge]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes += [IsDecisionJudge]
        elif self.action == 'retrieve':
            permission_classes += [CanViewDecision]
        elif self.action == 'finalize':
            permission_classes += [IsDecisionJudge]
        elif self.action == 'publish':
            permission_classes += [CanPublishDecision]
        elif self.action in ['acknowledge', 'appeal']:
            permission_classes += [IsPartyToDecision]
            
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.save(judge=request.user, status=Decision.DecisionStatus.DRAFT)
        
        # Snapshot the initial version
        DecisionWorkflowService.save_draft(decision, request.user, is_major_change=True)
        
        # Log Decision Creation
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_CREATED,
            obj=decision,
            description=f"Draft decision created for case {decision.case.file_number}",
            entity_name=decision.title
        )
        
        return Response(DecisionSerializer(decision).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        is_major_change = self.request.data.get('is_major_change', False)
        if isinstance(is_major_change, str):
            is_major_change = is_major_change.lower() in ['true', '1', 'yes']
            
        decision = serializer.save()
        DecisionWorkflowService.save_draft(decision, self.request.user, is_major_change=is_major_change)
        
        # Log Decision Update
        create_audit_log(
            request=self.request,
            action_type=AuditLog.ActionType.DECISION_UPDATED,
            obj=decision,
            description=f"Decision draft updated (Major change: {is_major_change})",
            entity_name=decision.decision_number or "DRAFT"
        )

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Finalize a draft decision and generate PDF"""
        decision = self.get_object()
        DecisionWorkflowService.finalize_decision(decision, request.user)
        
        # Log Decision Finalized
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_UPDATED,
            obj=decision,
            description=f"Decision {decision.decision_number} finalized. PDF generated.",
            entity_name=decision.decision_number
        )
        
        return Response({
            "message": "Decision finalized. PDF generated and Registrar notified.", 
            "status": decision.status,
            "decision_number": decision.decision_number
        })

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a finalized decision and close case"""
        decision = self.get_object()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        DecisionWorkflowService.publish_decision(decision, request.user)
        
        # Log Decision Published
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_PUBLISHED,
            obj=decision,
            description=f"Decision {decision.decision_number} published. Case CLOSED.",
            entity_name=decision.decision_number
        )
        
        return Response({
            "message": "Decision published successfully. Case CLOSED. Participants notified.",
            "decision_number": decision.decision_number,
            "published_at": decision.published_at,
            "case_status": decision.case.status
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
        
        # Log Decision Downloaded
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_DOWNLOADED,
            obj=decision,
            description=f"Decision PDF {decision.decision_number} downloaded",
            entity_name=decision.decision_number
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
        delivery = DecisionWorkflowService.acknowledge_receipt(decision, request.user)
        
        # Log Acknowledgment
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_UPDATED,
            obj=decision,
            description=f"Decision {decision.decision_number} acknowledgment received from {request.user.email}",
            entity_name=decision.decision_number
        )
        
        return Response({
            "message": "Decision acknowledged",
            "acknowledged_at": delivery.acknowledged_at
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsPartyToDecision])
    def appeal(self, request, pk=None):
        """File an appeal for a decision"""
        decision = self.get_object()
        reasons = request.data.get('reasons')
        if not reasons:
            raise BusinessLogicError("Reasons for appeal are required.")
            
        appeal = DecisionWorkflowService.file_appeal(decision, request.user, reasons)
        
        # Log Appeal
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_UPDATED,
            obj=decision,
            description=f"Appeal filed for decision {decision.decision_number} by {request.user.email}",
            entity_name=decision.decision_number
        )
        
        return Response({
            "message": "Appeal filed successfully",
            "appeal_id": appeal.id,
            "filed_at": appeal.filed_at
        })

    @action(detail=True, methods=['post', 'get'], permission_classes=[IsAuthenticated])
    def comments(self, request, pk=None):
        """Add or list comments for a decision"""
        decision = self.get_object()
        
        if request.method == 'POST':
            text = request.data.get('text')
            if not text:
                raise BusinessLogicError("Comment text is required.")
            comment = DecisionWorkflowService.add_comment(decision, request.user, text)
            
            # Log Comment
            create_audit_log(
                request=request,
                action_type=AuditLog.ActionType.DECISION_UPDATED,
                obj=decision,
                description=f"Comment added to decision {decision.decision_number or 'DRAFT'} by {request.user.email}",
                entity_name=decision.decision_number or "DRAFT"
            )
            
            return Response(DecisionCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
        else:
            comments = decision.comments.all()
            return Response(DecisionCommentSerializer(comments, many=True).data)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get version history of a decision"""
        decision = self.get_object()
        if request.user.role not in ['JUDGE', 'REGISTRAR', 'ADMIN']:
            raise BusinessLogicError("Only court officials can view version history.")
            
        versions = decision.versions.all()
        return Response(DecisionVersionSerializer(versions, many=True).data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending decisions (DRAFT or FINALIZED) for Judge/Registrar"""
        user = request.user
        if user.role == 'JUDGE':
            decisions = self.get_queryset().filter(judge=user, status__in=['DRAFT', 'FINALIZED'])
        elif user.role == 'REGISTRAR':
            decisions = self.get_queryset().filter(status='FINALIZED')
        else:
            decisions = self.get_queryset().filter(status__in=['DRAFT', 'FINALIZED'])
            
        page = self.paginate_queryset(decisions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-case/(?P<case_id>[^/.]+)')
    def by_case(self, request, case_id=None):
        """Get decisions by case ID"""
        decisions = self.get_queryset().filter(case_id=case_id)
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def published(self, request):
        """Get published decisions"""
        decisions = self.get_queryset().filter(status=Decision.DecisionStatus.PUBLISHED)
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
            created_at__gte=cutoff,
            status=Decision.DecisionStatus.PUBLISHED
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
