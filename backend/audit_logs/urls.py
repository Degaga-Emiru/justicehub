from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet
from decisions.views import DecisionViewSet


router = DefaultRouter()
router.register(r'logs', AuditLogViewSet, basename='audit-log')
router.register(r'decisions', DecisionViewSet, basename='audit-decision')


urlpatterns = [
    path('', include(router.urls)),
]
