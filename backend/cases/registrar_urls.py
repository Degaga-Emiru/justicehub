from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .registrar_views import RegistrarCaseViewSet

router = DefaultRouter()
router.register(r'cases', RegistrarCaseViewSet, basename='registrar-case')

urlpatterns = [
    path('', include(router.urls)),
]
