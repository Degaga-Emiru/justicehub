from rest_framework import generics, permissions, status, response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone
from .models import Case, JudgeAssignment, CaseDocument, CaseDocumentVersion
from .serializers import (
    JudgeDashboardSerializer, JudgeCaseSerializer, 
    CaseDetailSerializer, CaseDocumentSerializer
)
from hearings.models import Hearing
from accounts.permissions import IsJudge
from django.http import FileResponse
import os

class JudgeDashboardView(APIView):
    """
    Get Judge Dashboard Data
    GET /api/judge/dashboard
    """
    permission_classes = [permissions.IsAuthenticated, IsJudge]

    def get(self, request):
        judge = request.user
        
        # Get assigned cases
        assigned_assignments = JudgeAssignment.objects.filter(judge=judge, is_active=True)
        assigned_case_ids = assigned_assignments.values_list('case_id', flat=True)
        
        assigned_cases_count = len(assigned_case_ids)
        
        # Pending cases (assigned but status is ASSIGNED or IN_PROGRESS or PENDING_REVIEW?)
        # User example says assigned=25, pending=12, closed=8.
        # So pending is a subset of assigned.
        pending_cases_count = Case.objects.filter(
            id__in=assigned_case_ids,
            status__in=['ASSIGNED', 'IN_PROGRESS', 'PENDING_REVIEW']
        ).count()
        
        closed_cases_count = Case.objects.filter(
            id__in=assigned_case_ids,
            status='CLOSED'
        ).count()
        
        upcoming_bearings_count = Hearing.objects.filter(
            judge=judge,
            scheduled_date__gt=timezone.now(),
            status__in=['SCHEDULED', 'CONFIRMED']
        ).count()
        
        data = {
            "assigned_cases": assigned_cases_count,
            "pending_cases": pending_cases_count,
            "closed_cases": closed_cases_count,
            "upcoming_hearings": upcoming_bearings_count
        }
        
        serializer = JudgeDashboardSerializer(data)
        return response.Response(serializer.data)


class JudgeCaseListView(generics.ListAPIView):
    """
    Get All Cases Assigned to Judge
    GET /api/judge/cases
    """
    serializer_class = JudgeCaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsJudge]

    def get_queryset(self):
        judge = self.request.user
        assigned_case_ids = JudgeAssignment.objects.filter(
            judge=judge, is_active=True
        ).values_list('case_id', flat=True)
        
        queryset = Case.objects.filter(
            id__in=assigned_case_ids
        ).select_related(
            'category', 'created_by', 'plaintiff', 'defendant'
        ).prefetch_related(
            'documents', 'documents__versions', 'hearings'
        )
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter == 'pending':
                queryset = queryset.filter(status__in=['ASSIGNED', 'PENDING_REVIEW'])
            elif status_filter == 'active':
                queryset = queryset.filter(status='IN_PROGRESS')
            elif status_filter == 'closed':
                queryset = queryset.filter(status='CLOSED')
        
        return queryset


class JudgeCaseDetailView(generics.RetrieveAPIView):
    """
    Get Case Details that assigned to judge
    GET /api/judge/cases/{case_id}
    """
    serializer_class = CaseDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsJudge]
    lookup_field = 'id'
    lookup_url_kwarg = 'case_id'

    def get_queryset(self):
        judge = self.request.user
        assigned_case_ids = JudgeAssignment.objects.filter(
            judge=judge, is_active=True
        ).values_list('case_id', flat=True)
        
        return Case.objects.filter(id__in=assigned_case_ids)


class JudgeCaseDocumentListView(generics.ListAPIView):
    """
    Get Case Documents that assigned to judge
    GET /api/judge/cases/{case_id}/documents
    """
    serializer_class = CaseDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsJudge]

    def get_queryset(self):
        judge = self.request.user
        case_id = self.kwargs.get('case_id')
        
        # Ensure the case is assigned to this judge
        is_assigned = JudgeAssignment.objects.filter(
            judge=judge, case_id=case_id, is_active=True
        ).exists()
        
        if not is_assigned:
            return CaseDocument.objects.none()
            
        return CaseDocument.objects.filter(case_id=case_id)


class JudgeDocumentDownloadView(APIView):
    """
    Download Case Document
    GET /api/judge/documents/{document_id}/download
    Supports both local filesystem and cloud storage (Cloudinary, S3, etc.)
    """
    permission_classes = [permissions.IsAuthenticated, IsJudge]

    def get(self, request, document_id):
        # We need to find the document and check if the judge is assigned to the case
        try:
            document = CaseDocument.objects.get(id=document_id)
            case = document.case
            
            is_assigned = JudgeAssignment.objects.filter(
                judge=request.user, case=case, is_active=True
            ).exists()
            
            if not is_assigned:
                return response.Response(
                    {"detail": "Access denied. You are not assigned to this case."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            active_version = document.get_active_version()
            if not active_version or not active_version.file:
                return response.Response(
                    {"detail": "No active file version found for this document."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            clean_filename = os.path.basename(active_version.file_name) if active_version.file_name else 'document'
            
            action = request.query_params.get('action', 'download')
            is_attachment = action == 'download'

            # Check if remote storage (e.g., Cloudinary)
            is_remote = False
            try:
                if hasattr(active_version.file, 'url') and active_version.file.url.startswith('http'):
                    is_remote = True
            except Exception:
                pass

            if not is_remote:
                try:
                    file_obj = active_version.file.open('rb')
                    return FileResponse(file_obj, as_attachment=is_attachment, filename=clean_filename)
                except Exception:
                    pass
            else:
                # Fallback: return cloud storage URL (Cloudinary, S3, etc.)
                try:
                    file_url = active_version.file.url
                    if is_attachment and 'cloudinary.com' in file_url:
                        parts = file_url.split('/upload/')
                        if len(parts) == 2:
                            file_url = f"{parts[0]}/upload/fl_attachment/{parts[1]}"
                            
                    return response.Response({
                        "redirect_url": file_url,
                        "filename": clean_filename,
                        "message": "File is hosted on cloud storage. Use the redirect_url to access it."
                    }, status=status.HTTP_200_OK)
                except Exception:
                    pass

            return response.Response(
                {"detail": "File could not be located on local or cloud storage."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        except CaseDocument.DoesNotExist:
            return response.Response(
                {"detail": "Document not found."},
                status=status.HTTP_404_NOT_FOUND
            )
