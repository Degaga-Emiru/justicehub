from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import Case, JudgeAssignment
from .serializers import (
    CaseListSerializer, CaseDetailSerializer, 
    JudgeAssignmentSerializer, CaseReviewSerializer
)
from .filters import CaseFilter
from .permissions import IsRegistrar, IsAdmin
from .services import JudgeAssignmentService, CaseReviewService, AuditService
from audit_logs.models import AuditLog

class RegistrarCaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Registrars to manage cases, assignments, and review.
    """
    queryset = Case.objects.all().select_related(
        'category', 'created_by', 'plaintiff', 'defendant'
    ).prefetch_related('judge_assignments__judge')
    
    serializer_class = CaseDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsRegistrar | IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CaseFilter
    search_fields = [
        'title', 'file_number', 
        'plaintiff__first_name', 'plaintiff__last_name', 
        'defendant__first_name', 'defendant__last_name'
    ]
    ordering_fields = ['created_at', 'updated_at', 'filing_date']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        elif self.action == 'assign_judge':
            return JudgeAssignmentSerializer
        return super().get_serializer_class()

    @action(detail=True, methods=['patch'], url_path='assign-judge')
    def assign_judge(self, request, pk=None):
        """
        Manually assign or override a judge for a case.
        """
        case = self.get_object()
        judge_id = request.data.get('judge_id')
        notes = request.data.get('assignment_notes', '')
        
        if not judge_id:
            return Response(
                {"error": "judge_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            assignment = JudgeAssignmentService.assign_judge_manually(
                case=case,
                judge_id=judge_id,
                assigned_by=request.user,
                notes=notes
            )
            serializer = JudgeAssignmentSerializer(assignment)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get registrar dashboard statistics"""
        stats = {
            'total_cases': Case.objects.count(),
            'pending_review': Case.objects.filter(status='PENDING_REVIEW').count(),
            'approved_unpaid': Case.objects.filter(status='APPROVED', payment_status='NOT_PAID').count(),
            'paid_unassigned': Case.objects.filter(status='PAID').exclude(judge_assignments__is_active=True).count(),
            'total_judges': User.objects.filter(role='JUDGE', is_active=True).count() if 'User' in globals() else 0
        }
        # In case User is not imported globally yet
        from accounts.models import User
        stats['total_judges'] = User.objects.filter(role='JUDGE', is_active=True).count()
        
        return Response(stats)
