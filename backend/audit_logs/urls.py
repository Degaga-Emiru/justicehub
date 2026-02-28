from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserActionLogViewSet

router = DefaultRouter()
router.register(r'', UserActionLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
