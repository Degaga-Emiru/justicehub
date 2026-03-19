from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JudgePersonalReportView, JudgeFinancialReportView, SystemOverviewReportView,
    SystemDailyReportView, SystemWeeklyReportView, SystemMonthlyReportView,
    SystemYearlyReportView, SystemFinancialReportView, SystemStatusReportView,
    SystemStatusByJudgeReportView, ExportReportView,
    AnalyticsCaseTypeView, AnalyticsDisputeView, AnalyticsProblemView,
    AnalyticsResolutionTimeView, AnalyticsDemographicsView, AnalyticsIntelligenceView,
    ReportViewSet
)

router = DefaultRouter()
router.register(r'', ReportViewSet, basename='report')

urlpatterns = [
    # Stored Reports (Enhanced Model)
    path('', include(router.urls)),

    # Judge Reports
    path('judge/my-report/', JudgePersonalReportView.as_view(), name='judge-personal-report'),
    path('judge/financial/', JudgeFinancialReportView.as_view(), name='judge-financial-report'),
    
    # System Reports (Time-based & Overview)
    path('system/', ExportReportView.as_view(), name='system-dynamic-report'),
    path('system/overview/', SystemOverviewReportView.as_view(), name='system-overview-report'),
    path('system/daily/', SystemDailyReportView.as_view(), name='system-daily-report'),
    path('system/weekly/', SystemWeeklyReportView.as_view(), name='system-weekly-report'),
    path('system/monthly/', SystemMonthlyReportView.as_view(), name='system-monthly-report'),
    path('system/yearly/', SystemYearlyReportView.as_view(), name='system-yearly-report'),
    path('system/custom/', ExportReportView.as_view(), name='system-custom-report'),
    
    # Financial & Status
    path('system/financial/', SystemFinancialReportView.as_view(), name='system-financial-report'),
    path('system/status/', SystemStatusReportView.as_view(), name='system-status-report'),
    path('system/status/by-judge/', SystemStatusByJudgeReportView.as_view(), name='system-status-by-judge-report'),
    
    # Analytics (Phase 2)
    path('analytics/case-type/', AnalyticsCaseTypeView.as_view(), name='analytics-case-type'),
    path('analytics/disputes/', AnalyticsDisputeView.as_view(), name='analytics-disputes'),
    path('analytics/problem-summary/', AnalyticsProblemView.as_view(), name='analytics-problem-summary'),
    path('analytics/resolution-time/', AnalyticsResolutionTimeView.as_view(), name='analytics-resolution-time'),
    path('analytics/demographics/', AnalyticsDemographicsView.as_view(), name='analytics-demographics'),
    path('analytics/intelligence/', AnalyticsIntelligenceView.as_view(), name='analytics-intelligence'),

    # Unified Export
    path('export/', ExportReportView.as_view(), name='unified-export'),
]
