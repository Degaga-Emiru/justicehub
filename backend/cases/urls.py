from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CaseCategoryViewSet, basename='case-category')
router.register(r'judge-profiles', views.JudgeProfileViewSet, basename='judge-profile')
router.register(r'', views.CaseViewSet, basename='case')

urlpatterns = [
    path('', include(router.urls)),
    
    # Case specific endpoints
    path('<uuid:pk>/assign-judge/', views.AssignJudgeView.as_view(), name='assign-judge'),
    path('<uuid:pk>/documents/', views.CaseDocumentViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-documents'),
    path('<uuid:pk>/notes/', views.CaseNotesViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-notes'),
    path('<uuid:pk>/timeline/', views.CaseTimelineView.as_view(), name='case-timeline'),
    
    # Bulk operations
    path('bulk/assign/', views.BulkAssignJudgesView.as_view(), name='bulk-assign'),
    path('bulk/status-update/', views.BulkStatusUpdateView.as_view(), name='bulk-status-update'),
    
    # Statistics and reports
    path('statistics/dashboard/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('statistics/judge-workload/', views.JudgeWorkloadView.as_view(), name='judge-workload'),
    path('statistics/case-type-distribution/', views.CaseTypeDistributionView.as_view(), name='case-type-distribution'),
    
    # Export
    path('export/csv/', views.ExportCasesCSVView.as_view(), name='export-cases-csv'),
    path('export/pdf/', views.ExportCasesPDFView.as_view(), name='export-cases-pdf'),
]