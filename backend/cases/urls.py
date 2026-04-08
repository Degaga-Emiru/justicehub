from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# 1. Give cases a specific prefix "cases" instead of an empty string
router.register(r'', views.CaseViewSet, basename='case')
router.register(r'categories', views.CaseCategoryViewSet, basename='case-category')
router.register(r'judge-profiles', views.JudgeProfileViewSet, basename='judge-profile')
router.register(r'citizen/documents', views.CitizenDocumentViewSet, basename='citizen-document')
router.register(r'judge/documents', views.JudgeDocumentViewSet, basename='judge-document')

urlpatterns = [
    # Citizen Documents (Explicit patterns for nested paths)
    path('citizen/cases/<uuid:case_id>/documents/', views.CitizenDocumentViewSet.as_view({'get': 'list_by_case', 'post': 'upload_new'}), name='citizen-case-documents'),
    path('citizen/documents/versions/<uuid:version_id>/download/', views.CitizenDocumentViewSet.as_view({'get': 'download_version'}), name='citizen-version-download'),
    
    # Judge Documents (Explicit patterns for nested paths)
    path('judge/cases/<uuid:case_id>/documents/', views.JudgeDocumentViewSet.as_view({'get': 'list_by_case'}), name='judge-case-documents'),
    path('judge/documents/audit/<uuid:pk>/', views.JudgeDocumentViewSet.as_view({'get': 'audit_trail'}), name='judge-document-audit'),
    
    # Case specific endpoints
    path('<uuid:pk>/assign-judge/', views.AssignJudgeView.as_view(), name='assign-judge'),
    # path('<uuid:pk>/documents/', views.CaseDocumentViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-documents'),
    # path('documents/<uuid:pk>/download/', views.CaseDocumentViewSet.as_view({'get': 'download'}), name='case-document-download'),
    path('<uuid:pk>/notes/', views.CaseNotesViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-notes'),
    path('<uuid:pk>/timeline/', views.CaseTimelineView.as_view(), name='case-timeline'),
    
    # Bulk operations
    path('bulk/assign/', views.BulkAssignJudgesView.as_view(), name='bulk-assign'),
    path('bulk/status-update/', views.BulkStatusUpdateView.as_view(), name='bulk-status-update'),
    
    # Statistics and reports
    path('statistics/dashboard/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('statistics/judge-workload/', views.JudgeWorkloadView.as_view(), name='judge-workload'),
    path('statistics/case-type-distribution/', views.CaseTypeDistributionView.as_view(), name='case-type-distribution'),
    
    # 3. Put UUID paths NEXT
    # (Removed duplicated paths to avoid collisions)
    
    # Export paths
    path('export/csv/', views.ExportCasesCSVView.as_view(), name='export-cases-csv'),
    path('export/pdf/', views.ExportCasesPDFView.as_view(), name='export-cases-pdf'),

    # 4. Put the router at the VERY BOTTOM
    path('', include(router.urls)),
]