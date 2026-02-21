from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.DecisionViewSet, basename='decision')

urlpatterns = [
    path('', include(router.urls)),
    
    # Decision specific endpoints
    path('<uuid:pk>/publish/', views.PublishDecisionView.as_view(), name='publish-decision'),
    path('<uuid:pk>/download-pdf/', views.DownloadDecisionPDFView.as_view(), name='download-decision-pdf'),
    path('<uuid:pk>/deliveries/', views.DecisionDeliveriesView.as_view(), name='decision-deliveries'),
    path('<uuid:pk>/acknowledge/', views.AcknowledgeDecisionView.as_view(), name='acknowledge-decision'),
    
    # Bulk operations
    path('bulk/publish/', views.BulkPublishDecisionsView.as_view(), name='bulk-publish'),
    
    # Reports
    path('reports/monthly/', views.MonthlyDecisionsReportView.as_view(), name='monthly-decisions'),
    path('reports/judge-performance/', views.JudgeDecisionPerformanceView.as_view(), name='judge-decision-performance'),
]