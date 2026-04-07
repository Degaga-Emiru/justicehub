from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# 1. Give cases a specific prefix "cases" instead of an empty string
router.register(r'', views.CaseViewSet, basename='case')
router.register(r'categories', views.CaseCategoryViewSet, basename='case-category')
router.register(r'judge-profiles', views.JudgeProfileViewSet, basename='judge-profile')

urlpatterns = [
    # 2. Put bulk and statistics paths FIRST
    path('cases/bulk/assign/', views.BulkAssignJudgesView.as_view(), name='bulk-assign'),
    path('cases/bulk/status-update/', views.BulkStatusUpdateView.as_view(), name='bulk-status-update'),
    path('statistics/dashboard/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('statistics/judge-workload/', views.JudgeWorkloadView.as_view(), name='judge-workload'),
    path('statistics/case-type-distribution/', views.CaseTypeDistributionView.as_view(), name='case-type-distribution'),
    
    # 3. Put UUID paths NEXT
    path('cases/<uuid:pk>/assign-judge/', views.AssignJudgeView.as_view(), name='assign-judge'),
    path('cases/<uuid:pk>/timeline/', views.CaseTimelineView.as_view(), name='case-timeline'),
    
    # Export paths
    path('export/csv/', views.ExportCasesCSVView.as_view(), name='export-cases-csv'),
    path('export/pdf/', views.ExportCasesPDFView.as_view(), name='export-cases-pdf'),

    # 4. Put the router at the VERY BOTTOM
    path('', include(router.urls)),
]