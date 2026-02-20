from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.DecisionViewSet, basename='decision')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:pk>/publish/', views.PublishDecisionView.as_view(), name='publish-decision'),
    path('<uuid:pk>/download-pdf/', views.DownloadDecisionPDFView.as_view(), name='download-decision-pdf'),
]