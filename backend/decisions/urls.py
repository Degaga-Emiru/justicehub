from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.DecisionViewSet, basename='decision')

urlpatterns = [
    path('', include(router.urls)),
    
    # Bulk operations
    path('bulk/publish/', views.BulkPublishDecisionsView.as_view(), name='bulk-publish'),
    
    # Reports
    path('reports/monthly/', views.MonthlyDecisionsReportView.as_view(), name='monthly-decisions'),
    path('reports/judge-performance/', views.JudgeDecisionPerformanceView.as_view(), name='judge-decision-performance'),
]