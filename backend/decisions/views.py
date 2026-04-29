from rest_framework import viewsets, status, generics, pagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from django.db import transaction, models
from datetime import timedelta

from .models import Decision, DecisionDelivery, DecisionVersion, DecisionComment
from .serializers import (
    DecisionSerializer, DecisionDeliverySerializer,
    DecisionPublishSerializer, DecisionVersionSerializer,
    DecisionCommentSerializer,
    DecisionDocumentUploadSerializer, DecisionSignatureSerializer,
    ImmediateDecisionSerializer
)
from .permissions import (
    IsDecisionJudge, CanPublishDecision, CanViewDecision,
    IsPartyToDecision
)
from .services import generate_decision_pdf, deliver_decision, DecisionWorkflowService
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog
from notifications.services import create_notification, notify_case_participants
from cases.models import CaseDocument, CaseDocumentVersion
from core.exceptions import BusinessLogicError
from core.cryptography import verify_signature as crypto_verify_signature
import logging

logger = logging.getLogger(__name__)


class DecisionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing decisions with workflow states (Draft, Finalized, Published).
    """
    queryset = Decision.objects.all().select_related(
        'case', 'judge'
    ).prefetch_related(
        'deliveries__recipient', 'versions', 'comments__author'
    )
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'publish':
            return DecisionPublishSerializer
        elif self.action == 'comments':
            return DecisionCommentSerializer
        elif self.action == 'upload_decision_document':
            return DecisionDocumentUploadSerializer
        return DecisionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['ADMIN', 'REGISTRAR']:
            return self.queryset
        elif user.role == 'JUDGE':
            # Judges see only decisions for cases they are assigned to (as active judge)
            from cases.models import JudgeAssignment
            assigned_cases = JudgeAssignment.objects.filter(
                judge=user, 
                is_active=True
            ).values_list('case_id', flat=True)
            return self.queryset.filter(case_id__in=assigned_cases).distinct()
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
        elif self.action == 'acknowledge':
            permission_classes += [IsPartyToDecision]
        elif self.action == 'upload_decision_document':
            permission_classes += [IsDecisionJudge]
        elif self.action in ['signature', 'verify_signature']:
            permission_classes += [CanViewDecision]
            
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
            
        if self.instance.document and self.instance.document.is_signed:
            raise BusinessLogicError("Signed court decisions cannot be modified.")
            
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
            "message": "Decision finalized. Case CLOSED and Participants notified.", 
            "status": decision.status,
            "decision_number": decision.decision_number,
            "case_status": decision.case.status
        })

    @action(detail=True, methods=['post'], url_path='upload-decision-document', parser_classes=[MultiPartParser, FormParser])
    def upload_decision_document(self, request, pk=None):
        """Upload a manual decision document (PDF/DOCX)"""
        decision = self.get_object()
        
        if decision.status != Decision.DecisionStatus.DRAFT:
            raise BusinessLogicError("Documents can only be uploaded for draft decisions.")
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = serializer.validated_data['file']
        
        with transaction.atomic():
            # 1. Create CaseDocument
            case_doc = CaseDocument.objects.create(
                case=decision.case,
                uploaded_by=request.user,
                document_type=CaseDocument.DocumentType.JUDGMENT,
                description=f"Uploaded Decision for {decision.title}"
            )
            
            # 2. Create CaseDocumentVersion
            ext = uploaded_file.name.split('.')[-1].lower()
            CaseDocumentVersion.objects.create(
                document=case_doc,
                file=uploaded_file,
                uploaded_by=request.user,
                version_number=1,
                status=CaseDocumentVersion.VersionStatus.APPROVED,
                is_active=True,
                file_name=uploaded_file.name,
                file_size=uploaded_file.size,
                file_type=ext
            )
            
            # 3. Link to Decision
            decision.document = case_doc
            decision.save()
            
        return Response({
            "message": "Decision document uploaded successfully.",
            "document_id": case_doc.id,
            "file_name": uploaded_file.name
        }, status=status.HTTP_201_CREATED)

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

    @action(detail=False, methods=['post'], url_path='by-case/(?P<case_id>[^/.]+)/immediate')
    def immediate(self, request, case_id=None):
        """Create an immediate decision for a case"""
        from cases.models import Case, JudgeAssignment
        case = get_object_or_404(Case, id=case_id)
        
        # 1. Permission check: judge assigned to case
        is_assigned = JudgeAssignment.objects.filter(
            case=case,
            judge=request.user,
            is_active=True
        ).exists()
        
        if not is_assigned and request.user.role != 'ADMIN':
            return Response(
                {"error": "You are not the active judge assigned to this case."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # 2. Validation
        serializer = ImmediateDecisionSerializer(data=request.data, context={'case': case})
        serializer.is_valid(raise_exception=True)
        
        # 3. Decision Logic
        decision = DecisionWorkflowService.create_immediate_decision(
            case=case,
            judge=request.user,
            reason=serializer.validated_data['reason'],
            description=serializer.validated_data['description']
        )
        
        # Log Audit
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DECISION_CREATED, # Or IMMEDIATE_DECISION
            obj=decision,
            description=f"Immediate decision issued for case {case.file_number}. Reason: {decision.immediate_reason}",
            entity_name=decision.decision_number
        )
        
        return Response(DecisionSerializer(decision).data, status=status.HTTP_201_CREATED)

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

    @action(detail=True, methods=['get'])
    def signature(self, request, pk=None):
        """Get digital signature metadata for the decision"""
        decision = self.get_object()
        if not decision.document or not decision.document.is_signed:
            return Response(
                {"error": "Decision has not been digitally signed yet."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = DecisionSignatureSerializer(decision)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='verify-signature')
    def verify_signature(self, request, pk=None):
        """Recalculate hash and verify the digital signature"""
        decision = self.get_object()
        if not decision.document or not decision.document.is_signed:
            return Response(
                {"error": "Decision has not been digitally signed yet."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doc = decision.document
        active_version = doc.get_active_version()
        if not active_version or not active_version.file:
            return Response(
                {"error": "Document file not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from core.cryptography import get_document_hash
        try:
            current_hash = get_document_hash(active_version.file.path)
            is_valid = crypto_verify_signature(current_hash, doc.digital_signature)
            
            if is_valid:
                return Response({
                    "valid": True,
                    "message": "Decision signature is valid"
                })
            else:
                return Response({
                    "valid": False,
                    "message": "Decision document integrity compromised"
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Verification failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Alias for download_pdf as requested"""
        return self.download_pdf(request, pk)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.document and instance.document.is_signed:
            raise BusinessLogicError("Signed court decisions cannot be deleted.")
        return super().destroy(request, *args, **kwargs)


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
        
        # Log Audit
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.REPORT_GENERATED,
            description=f"Generated Monthly Decisions Report for {month}/{year}",
            entity_name=f"Report_{year}_{month}"
        )
        
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
        
        # Log Audit
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.REPORT_GENERATED,
            description="Generated Judge Decision Performance Report",
            entity_name="Judge_Performance_Report"
        )
        
        return Response(data)
