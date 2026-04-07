from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
import csv
#from weasyprint import HTML
from django.template.loader import render_to_string

from .models import (
    CaseCategory, Case, CaseDocument, 
    JudgeAssignment, CaseNotes, JudgeProfile
)
from .serializers import (
    CaseCategorySerializer, CaseCreateSerializer, CaseDetailSerializer,
    CaseListSerializer, CaseReviewSerializer, JudgeAssignmentSerializer,
    CaseDocumentSerializer, CaseNotesSerializer, JudgeProfileSerializer,
    CaseBulkAssignSerializer, CaseStatusUpdateSerializer,
    DashboardStatsSerializer, JudgeWorkloadSerializer
)
from .permissions import (
    IsRegistrar, IsJudge, IsAssignedJudge, IsAdmin,
    CanReviewCases, CanManageDocuments, IsPartyToCase
)
from .filters import CaseFilter
from .pagination import StandardResultsSetPagination
from .services import JudgeAssignmentService, CaseReviewService
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog
from notifications.services import create_notification
from core.exceptions import BusinessLogicError
import logging

logger = logging.getLogger(__name__)


class CaseCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing case categories.
    """
    queryset = CaseCategory.objects.all()
    serializer_class = CaseCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsAdmin]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active categories"""
        categories = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cases with support for both JSON and form-data.
    """
    queryset = Case.objects.all().select_related(
        'category', 'created_by', 'plaintiff', 'defendant',
        'plaintiff_lawyer', 'defendant_lawyer', 'reviewed_by'
    ).prefetch_related('documents', 'judge_assignments')
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CaseFilter
    search_fields = ['title', 'description', 'file_number']
    ordering_fields = ['created_at', 'filing_date', 'priority']
    pagination_class = StandardResultsSetPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateSerializer
        elif self.action == 'list':
            return CaseListSerializer
        elif self.action in ['accept_reject', 'review']:
            return CaseReviewSerializer
        elif self.action == 'upload_documents':
            return CaseDocumentSerializer
        return CaseDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['ADMIN', 'REGISTRAR', 'CLERK']:
            return self.queryset
        elif user.role == 'JUDGE':
            # Judges see only assigned cases
            return self.queryset.filter(
                judge_assignments__judge=user,
                judge_assignments__is_active=True
            )
        elif user.role == 'LAWYER':
            # Lawyers see cases they're representing
            return self.queryset.filter(
                Q(plaintiff_lawyer=user) | Q(defendant_lawyer=user)
            )
        else:
            # Clients see their own cases
            return self.queryset.filter(
                Q(created_by=user) | Q(plaintiff=user) | Q(defendant=user)
            )
    
    def create(self, request, *args, **kwargs):
        """
        Override create to handle both JSON and multipart/form-data requests.
        """
        # Handle multipart/form-data (file uploads)
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Pass request.data directly – do NOT .copy() as it deep-copies
            # file handles (BufferedRandom) which cannot be pickled.
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Save the case (documents handled inside CaseCreateSerializer.create)
            self.perform_create(serializer)
            
            headers = self.get_success_headers(serializer.data)
            # Return detailed serializer data
            detail_serializer = CaseDetailSerializer(serializer.instance, context={'request': request})
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
        # Default JSON handling
        return super().create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log Case Viewed
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.CASE_VIEWED,
            obj=instance,
            description=f"User {request.user.email} viewed case {instance.file_number or instance.title}",
            entity_name=instance.file_number or instance.title
        )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        Override update to handle both JSON and multipart/form-data.
        """
        if request.content_type and 'multipart/form-data' in request.content_type:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            
            # Create a mutable copy of request.data
            data = request.data.copy()
            
            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Handle document uploads if any
            documents = request.FILES.getlist('documents')
            if documents:
                document_types = request.data.getlist('document_types', [])
                document_descriptions = request.data.getlist('document_descriptions', [])
                
                for i, document_file in enumerate(documents):
                    doc_type = document_types[i] if i < len(document_types) else 'OTHER'
                    doc_description = document_descriptions[i] if i < len(document_descriptions) else ''
                    
                    CaseDocument.objects.create(
                        case=instance,
                        uploaded_by=request.user,
                        file=document_file,
                        document_type=doc_type,
                        description=doc_description,
                        is_confidential=request.data.get('is_confidential', False)
                    )
            
            return Response(serializer.data)
        
        return super().update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def pending_review(self, request):
        """Get cases pending review (for registrars)"""
        if not request.user.role in ['ADMIN', 'REGISTRAR', 'CLERK']:
            return Response(
                {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        cases = self.get_queryset().filter(status='PENDING_REVIEW')
        page = self.paginate_queryset(cases)
        serializer = CaseListSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_cases(self, request):
        """Get cases related to current user"""
        cases = self.get_queryset()
        page = self.paginate_queryset(cases)
        serializer = CaseListSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[CanReviewCases])
    def review(self, request, pk=None):
        """Accept or reject a case"""
        case = self.get_object()
        
        if case.status != 'PENDING_REVIEW':
            raise BusinessLogicError("Only pending cases can be reviewed.")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        
        try:
            if action == 'accept':
                result = CaseReviewService.accept_case(
                    case=case,
                    reviewer=request.user,
                    court_name=serializer.validated_data.get('court_name'),
                    court_room=serializer.validated_data.get('court_room')
                )
                return Response({
                    "message": "Case accepted successfully.",
                    "file_number": case.file_number,
                    "status": "Assignment in progress"
                }, status=status.HTTP_200_OK)
            
            else:  # reject
                result = CaseReviewService.reject_case(
                    case=case,
                    reviewer=request.user,
                    reason=serializer.validated_data['rejection_reason']
                )
                return Response({
                    "message": "Case rejected successfully."
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error reviewing case {case.id}: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def add_document(self, request, pk=None):
        """Add document to case - supports multipart/form-data"""
        case = self.get_object()
        
        if 'file' not in request.FILES:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        document_type = request.data.get('document_type', 'OTHER')
        description = request.data.get('description', '')
        is_confidential = request.data.get('is_confidential', False)
        
        # Handle boolean conversion for is_confidential
        if isinstance(is_confidential, str):
            is_confidential = is_confidential.lower() in ['true', '1', 'yes']
        
        document = CaseDocument.objects.create(
            case=case,
            uploaded_by=request.user,
            file=file,
            document_type=document_type,
            description=description,
            is_confidential=is_confidential
        )
        
        serializer = CaseDocumentSerializer(document, context={'request': request})
        
        # Notify relevant parties
        create_notification(
            user=case.created_by,
            type='DOCUMENT_UPLOADED',
            title='Document Uploaded',
            message=f"A new document has been uploaded to your case: {document.file_name}",
            case=case
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_multiple_documents(self, request, pk=None):
        """Upload multiple documents to a case"""
        case = self.get_object()
        
        if 'documents' not in request.FILES:
            return Response(
                {"error": "No files provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        documents = request.FILES.getlist('documents')
        document_types = request.data.getlist('document_types', [])
        descriptions = request.data.getlist('descriptions', [])
        is_confidential = request.data.get('is_confidential', False)
        
        # Handle boolean conversion for is_confidential
        if isinstance(is_confidential, str):
            is_confidential = is_confidential.lower() in ['true', '1', 'yes']
        
        uploaded_docs = []
        for i, file in enumerate(documents):
            doc_type = document_types[i] if i < len(document_types) else 'OTHER'
            description = descriptions[i] if i < len(descriptions) else ''
            
            document = CaseDocument.objects.create(
                case=case,
                uploaded_by=request.user,
                file=file,
                document_type=doc_type,
                description=description,
                is_confidential=is_confidential
            )
            uploaded_docs.append(CaseDocumentSerializer(document, context={'request': request}).data)
            
            # Notify about each document
            create_notification(
                user=case.created_by,
                type='DOCUMENT_UPLOADED',
                title='Document Uploaded',
                message=f"A new document has been uploaded to your case: {document.file_name}",
                case=case
            )
        
        # Log Document Uploads
        for doc in uploaded_docs:
            create_audit_log(
                request=request,
                action_type=AuditLog.ActionType.DOCUMENT_UPLOADED,
                obj=CaseDocument.objects.get(id=doc['id']),
                description=f"Document {doc['file_name']} uploaded to case {case.file_number}",
                entity_name=doc['file_name']
            )

        return Response(uploaded_docs, status=status.HTTP_201_CREATED)
    

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Get case timeline"""
        case = self.get_object()
        
        timeline = []
        
        # Case creation
        timeline.append({
            'date': case.created_at,
            'event': 'Case Filed',
            'description': f'Case filed by {case.created_by.get_full_name()}',
            'user': case.created_by.get_full_name()
        })
        
        # Review events
        if case.reviewed_at:
            action = 'Accepted' if case.status == 'ACCEPTED' else 'Rejected'
            timeline.append({
                'date': case.reviewed_at,
                'event': f'Case {action}',
                'description': f'Case reviewed by {case.reviewed_by.get_full_name()}',
                'user': case.reviewed_by.get_full_name()
            })
        
        # Judge assignments
        for assignment in case.judge_assignments.all():
            timeline.append({
                'date': assignment.assigned_at,
                'event': 'Judge Assigned',
                'description': f'Judge {assignment.judge.get_full_name()} assigned to case',
                'user': assignment.assigned_by.get_full_name()
            })
        
        # Hearings
        if hasattr(case, 'hearings'):
            for hearing in case.hearings.all():
                timeline.append({
                    'date': hearing.created_at,
                    'event': f'Hearing {hearing.get_status_display()}',
                    'description': hearing.title,
                    'user': hearing.judge.get_full_name()
                })
        
        # Decisions
        if hasattr(case, 'decisions'):
            for decision in case.decisions.all():
                timeline.append({
                    'date': decision.created_at,
                    'event': 'Decision Issued',
                    'description': f'Decision {decision.decision_number} issued',
                    'user': decision.judge.get_full_name()
                })
        
        # Sort by date
        timeline.sort(key=lambda x: x['date'], reverse=True)
        
        return Response(timeline)


class AssignJudgeView(generics.CreateAPIView):
    """
    View for assigning judge to case.
    """
    serializer_class = JudgeAssignmentSerializer
    permission_classes = [IsAuthenticated, IsRegistrar]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response(
                {"error": "Case not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        judge_id = request.data.get('judge_id')
        if not judge_id:
            return Response(
                {"error": "judge_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            assignment = JudgeAssignmentService.assign_judge_manually(
                case=case,
                judge_id=judge_id,
                assigned_by=request.user,
                notes=request.data.get('assignment_notes')
            )
            
            serializer = self.get_serializer(assignment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CaseDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing case documents.
    """
    serializer_class = CaseDocumentSerializer
    permission_classes = [IsAuthenticated, CanManageDocuments]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        return CaseDocument.objects.filter(case_id=self.kwargs['pk'])
    
    def perform_create(self, serializer):
        case = Case.objects.get(pk=self.kwargs['pk'])
        serializer.save(
            case=case,
            uploaded_by=self.request.user
        )
    
    def create(self, request, *args, **kwargs):
        """Override create to handle file uploads"""
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle multipart form data
            case = Case.objects.get(pk=self.kwargs['pk'])
            
            if 'file' not in request.FILES:
                return Response(
                    {"error": "No file provided."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Save with the case and user
            serializer.save(
                case=case,
                uploaded_by=request.user,
                file=request.FILES['file']
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return super().create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log Document Viewed
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DOCUMENT_VIEWED,
            obj=instance,
            description=f"User {request.user.email} viewed document {instance.file_name}",
            entity_name=instance.file_name
        )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        doc_name = instance.file_name
        
        # Log Document Deleted
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DOCUMENT_DELETED,
            obj=instance,
            description=f"Document {doc_name} deleted from case {instance.case.file_number}",
            entity_name=doc_name
        )
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download document and log event"""
        instance = self.get_object()
        
        # Log Document Downloaded
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DOCUMENT_DOWNLOADED,
            obj=instance,
            description=f"Document {instance.file_name} downloaded",
            entity_name=instance.file_name
        )
        
        from django.http import FileResponse
        return FileResponse(instance.file.open('rb'), as_attachment=True, filename=instance.file_name)


class CaseNotesViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing case notes.
    """
    serializer_class = CaseNotesSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        user = self.request.user
        case_id = self.kwargs['pk']
        
        if user.role in ['ADMIN', 'JUDGE', 'REGISTRAR', 'CLERK']:
            return CaseNotes.objects.filter(case_id=case_id)
        else:
            # Only show non-private notes to others
            return CaseNotes.objects.filter(
                case_id=case_id,
                is_private=False
            )
    
    def perform_create(self, serializer):
        case = Case.objects.get(pk=self.kwargs['pk'])
        serializer.save(
            case=case,
            author=self.request.user
        )


class JudgeProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing judge profiles.
    """
    queryset = JudgeProfile.objects.all().select_related('user')
    serializer_class = JudgeProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def available(self, request):
        """Get available judges for a category"""

        category_id = request.query_params.get('category')
        if not category_id:
            return Response(
                {"error": "Category ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        available = JudgeAssignmentService.find_available_judges(category_id)

        response_data = []

        for item in available:
            judge = item["judge"]

            # Get judge profile
            try:
                profile = JudgeProfile.objects.select_related("user").get(user=judge)
            except JudgeProfile.DoesNotExist:
                continue

            serialized_profile = JudgeProfileSerializer(profile).data
            serialized_profile["caseload"] = item["active_count"]
            serialized_profile["max_cases"] = item["max_cases"]
            response_data.append(serialized_profile)

        return Response(response_data, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'])
    def workload(self, request):
        """Get judge workload statistics"""
        judges = self.get_queryset()
        data = []
        
        for judge in judges:
            data.append({
                'judge_id': judge.id,
                'judge_name': judge.user.get_full_name(),
                'active_cases': judge.get_active_case_count(),
                'max_cases': judge.max_active_cases,
                'utilization': (judge.get_active_case_count() / judge.max_active_cases) * 100
            })
        
        return Response(data)


class CaseTimelineView(generics.RetrieveAPIView):
    """
    View for getting case timeline.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response(
                {"error": "Case not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permission
        if not (request.user.role in ['ADMIN', 'JUDGE', 'REGISTRAR', 'CLERK'] or 
                case.created_by == request.user):
            return Response(
                {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        timeline = []
        
        # Case creation
        timeline.append({
            'date': case.created_at,
            'event_type': 'CASE_CREATED',
            'title': 'Case Filed',
            'description': f'Case filed by {case.created_by.get_full_name()}',
            'user': case.created_by.get_full_name(),
            'icon': 'file-text'
        })
        
        # Document uploads
        for doc in case.documents.all():
            timeline.append({
                'date': doc.uploaded_at,
                'event_type': 'DOCUMENT_UPLOADED',
                'title': 'Document Uploaded',
                'description': f'{doc.file_name} uploaded',
                'user': doc.uploaded_by.get_full_name(),
                'icon': 'file'
            })
        
        # Review events
        if case.reviewed_at:
            event_type = 'CASE_APPROVED' if case.status in ['APPROVED', 'PAID', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED'] else 'CASE_REJECTED'
            title = 'Case Approved' if case.status != 'REJECTED' else 'Case Rejected'
            icon = 'check-circle' if case.status != 'REJECTED' else 'x-circle'
            
            timeline.append({
                'date': case.reviewed_at,
                'event_type': event_type,
                'title': title,
                'description': f'Case reviewed by {case.reviewed_by.get_full_name()}',
                'user': case.reviewed_by.get_full_name(),
                'icon': icon
            })

        # Payment events
        for payment in getattr(case, 'payments', []).all():
            if payment.status == 'VERIFIED':
                timeline.append({
                    'date': payment.updated_at,
                    'event_type': 'PAYMENT_RECEIVED',
                    'title': 'Payment Verified',
                    'description': f'Payment of {payment.amount} ETB verified (Ref: {payment.transaction_reference})',
                    'user': payment.user.get_full_name(),
                    'icon': 'credit-card'
                })
        
        # Judge assignments
        for assignment in case.judge_assignments.all():
            timeline.append({
                'date': assignment.assigned_at,
                'event_type': 'JUDGE_ASSIGNED',
                'title': 'Judge Assigned',
                'description': f'Judge {assignment.judge.get_full_name()} assigned',
                'user': assignment.assigned_by.get_full_name(),
                'icon': 'user'
            })
        
        # Sort by date
        timeline.sort(key=lambda x: x['date'], reverse=True)
        
        return Response(timeline)


class BulkAssignJudgesView(generics.GenericAPIView):
    """
    View for bulk judge assignment.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    serializer_class = CaseBulkAssignSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        case_ids = serializer.validated_data['case_ids']
        judge_id = serializer.validated_data['judge_id']
        
        results = {
            'success': [],
            'failed': []
        }
        
        for case_id in case_ids:
            try:
                case = Case.objects.get(pk=case_id)
                assignment = JudgeAssignmentService.assign_judge_manually(
                    case=case,
                    judge_id=judge_id,
                    assigned_by=request.user
                )
                results['success'].append({
                    'case_id': case_id,
                    'assignment_id': assignment.id
                })
            except Exception as e:
                results['failed'].append({
                    'case_id': case_id,
                    'error': str(e)
                })
        
        return Response(results)


class BulkStatusUpdateView(generics.GenericAPIView):
    """
    View for bulk status update.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    serializer_class = CaseStatusUpdateSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        case_ids = serializer.validated_data['case_ids']
        status = serializer.validated_data['status']
        reason = serializer.validated_data.get('reason', '')
        
        updated = Case.objects.filter(id__in=case_ids).update(
            status=status,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            rejection_reason=reason if status == 'REJECTED' else None
        )
        
        return Response({
            'updated_count': updated,
            'status': status
        })


class DashboardStatsView(generics.GenericAPIView):
    """
    View for dashboard statistics.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        stats = {}
        
        if user.role in ['ADMIN', 'REGISTRAR', 'CLERK']:
            stats = {
                'total_cases': Case.objects.count(),
                'pending_review': Case.objects.filter(status='PENDING_REVIEW').count(),
                'active_cases': Case.objects.filter(status__in=['ASSIGNED', 'IN_PROGRESS']).count(),
                'closed_cases': Case.objects.filter(status='CLOSED').count(),
                'total_judges': JudgeProfile.objects.count(),
                'avg_processing_time': Case.objects.filter(
                    status='CLOSED'
                ).annotate(
                    processing_time=Avg('closed_date - created_at')
                ).values('processing_time')
            }
        elif user.role == 'JUDGE':
            stats = {
                'assigned_cases': Case.objects.filter(
                    judge_assignments__judge=user,
                    judge_assignments__is_active=True
                ).count(),
                'pending_decisions': Case.objects.filter(
                    judge_assignments__judge=user,
                    judge_assignments__is_active=True,
                    status='IN_PROGRESS'
                ).exclude(
                    decisions__isnull=False
                ).count(),
                'completed_hearings': user.presiding_hearings.filter(
                    status='COMPLETED'
                ).count()
            }
        else:
            stats = {
                'my_cases': Case.objects.filter(
                    Q(created_by=user) | Q(plaintiff=user) | Q(defendant=user)
                ).count(),
                'active_cases': Case.objects.filter(
                    Q(created_by=user) | Q(plaintiff=user) | Q(defendant=user),
                    status__in=['ASSIGNED', 'IN_PROGRESS']
                ).count(),
                'upcoming_hearings': user.hearings_participated.filter(
                    hearing__scheduled_date__gte=timezone.now(),
                    hearing__status='SCHEDULED'
                ).count()
            }
        
        return Response(stats)


class JudgeWorkloadView(generics.GenericAPIView):
    """
    View for judge workload analysis.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        judges = JudgeProfile.objects.all().select_related('user')
        
        data = []
        for judge in judges:
            active_cases = judge.get_active_case_count()
            data.append({
                'judge_id': judge.id,
                'judge_name': judge.user.get_full_name(),
                'email': judge.user.email,
                'specializations': [s.name for s in judge.specializations.all()],
                'active_cases': active_cases,
                'max_cases': judge.max_active_cases,
                'available_slots': judge.max_active_cases - active_cases,
                'utilization_percentage': (active_cases / judge.max_active_cases) * 100 if judge.max_active_cases > 0 else 0
            })
        
        # Sort by utilization (lowest first)
        data.sort(key=lambda x: x['utilization_percentage'])
        
        return Response(data)


class CaseTypeDistributionView(generics.GenericAPIView):
    """
    View for case type distribution statistics.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        distribution = Case.objects.values(
            'category__name'
        ).annotate(
            count=Count('id'),
            pending=Count('id', filter=Q(status='PENDING_REVIEW')),
            active=Count('id', filter=Q(status__in=['ASSIGNED', 'IN_PROGRESS'])),
            closed=Count('id', filter=Q(status='CLOSED'))
        ).order_by('-count')
        
        return Response(distribution)


class ExportCasesCSVView(generics.GenericAPIView):
    """
    View for exporting cases to CSV.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="cases_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'File Number', 'Title', 'Category', 'Status', 'Priority',
            'Client', 'Filed Date', 'Closed Date', 'Judge'
        ])
        
        cases = Case.objects.select_related(
            'category', 'created_by'
        ).prefetch_related('judge_assignments')
        
        for case in cases:
            current_judge = case.judge_assignments.filter(is_active=True).first()
            writer.writerow([
                case.file_number or 'PENDING',
                case.title,
                case.category.name,
                case.get_status_display(),
                case.get_priority_display(),
                case.created_by.get_full_name(),
                case.filing_date.strftime('%Y-%m-%d'),
                case.closed_date.strftime('%Y-%m-%d') if case.closed_date else '',
                current_judge.judge.get_full_name() if current_judge else ''
            ])
        
        # Log Document Downloaded
        # Note: 'instance' and 'file_name' are not defined in this context.
        # This log entry might be intended for a single document download,
        # not a bulk CSV export.
        # For a CSV export, you might log the type of report downloaded.
        # create_audit_log(
        #     request=request,
        #     action_type=AuditLog.ActionType.DOCUMENT_DOWNLOADED,
        #     obj=instance, # Undefined
        #     description=f"Document {instance.file_name} downloaded", # Undefined
        #     entity_name=instance.file_name # Undefined
        # )

        return response


class ExportCasesPDFView(generics.GenericAPIView):
    """
    View for exporting cases to PDF.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        cases = Case.objects.select_related(
            'category', 'created_by'
        ).prefetch_related('judge_assignments')[:100]  # Limit to 100 for PDF
        
        html_string = render_to_string('reports/cases_report.html', {
            'cases': cases,
            'generated_at': timezone.now()
        })
        
        pdf_file = HTML(string=html_string).write_pdf()
        
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="cases_report.pdf"'
        
        return response