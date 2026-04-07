from django.urls import path
from . import admin_views
from audit_logs.views import AuditLogViewSet

urlpatterns = [
    # System monitoring
    path('admin/system/metrics/', admin_views.SystemMetricsView.as_view(), name='system-metrics'),
    path('admin/system/errors/', admin_views.ErrorLogsView.as_view(), name='system-errors'),
    
    # Reports
    path('admin/reports/statistics/', admin_views.StatisticsReportView.as_view(), name='report-statistics'),
    path('admin/reports/performance/', admin_views.PerformanceReportView.as_view(), name='report-performance'),
    path('admin/reports/export/', admin_views.ExportReportView.as_view(), name='report-export'),
    
    # Audit Dashboard (specific admin path)
    path('admin/audit/dashboard/', AuditLogViewSet.as_view({'get': 'dashboard'}), name='admin-audit-dashboard'),
    path('admin/audit/logs/', AuditLogViewSet.as_view({'get': 'list'}), name='admin-audit-logs'),
    path('admin/audit/purge/', AuditLogViewSet.as_view({'post': 'purge_old'}), name='admin-audit-purge'),
]
