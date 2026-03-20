from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JudgeReportView, AdminJudgeReportView, SystemReportView, AnalyticsReportView, ExportReportView,
    ReportViewSet
)

router = DefaultRouter()
router.register(r'', ReportViewSet, basename='report')

urlpatterns = [
    # Judge Dynamic Reports
    path('judge/', JudgeReportView.as_view(), name='judge-report'),
    path('admin/judge/<uuid:judge_id>/', AdminJudgeReportView.as_view(), name='admin-judge-report'),
    
    # System Dynamic Reports (Parameter-driven)
    path('admin/system/', SystemReportView.as_view(), name='system-report'),
    path('admin/analytics/', AnalyticsReportView.as_view(), name='analytics-report'),
    
    # Pro-Level Exports
    path('admin/export/pdf/', ExportReportView.as_view(), {'export_format': 'pdf'}, name='export-pdf'),
    path('admin/export/csv/', ExportReportView.as_view(), {'export_format': 'csv'}, name='export-csv'),
    path('admin/export/excel/', ExportReportView.as_view(), {'export_format': 'excel'}, name='export-excel'),

    # Backward compatibility / Unified Export
    path('export/', ExportReportView.as_view(), name='unified-export'),

    # Stored Reports (Enhanced Model - placed at bottom to avoid greedy matching)
    path('', include(router.urls)),
]
