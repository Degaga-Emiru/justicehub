from django.urls import path
from .views import (
    JudgePersonalReportView, JudgeFinancialReportView, SystemOverviewReportView,
    SystemDailyReportView, SystemWeeklyReportView, SystemMonthlyReportView,
    SystemYearlyReportView, SystemFinancialReportView, SystemStatusReportView,
    SystemStatusByJudgeReportView, ExportReportView
)

urlpatterns = [
    # Judge Reports
    path('judge/my-report/', JudgePersonalReportView.as_view(), name='judge-personal-report'),
    path('judge/financial/', JudgeFinancialReportView.as_view(), name='judge-financial-report'),
    
    # System Reports (Time-based & Overview)
    path('system/', ExportReportView.as_view(), name='system-dynamic-report'), # Dynamic last X days
    path('system/overview/', SystemOverviewReportView.as_view(), name='system-overview-report'),
    path('system/daily/', SystemDailyReportView.as_view(), name='system-daily-report'),
    path('system/weekly/', SystemWeeklyReportView.as_view(), name='system-weekly-report'),
    path('system/monthly/', SystemMonthlyReportView.as_view(), name='system-monthly-report'),
    path('system/yearly/', SystemYearlyReportView.as_view(), name='system-yearly-report'),
    path('system/custom/', ExportReportView.as_view(), name='system-custom-report'), # Reusing export for custom data
    
    # Financial & Status
    path('system/financial/', SystemFinancialReportView.as_view(), name='system-financial-report'),
    path('system/status/', SystemStatusReportView.as_view(), name='system-status-report'),
    path('system/status/by-judge/', SystemStatusByJudgeReportView.as_view(), name='system-status-by-judge-report'),
    
    # Unified Export
    path('export/', ExportReportView.as_view(), name='unified-export'),
]
