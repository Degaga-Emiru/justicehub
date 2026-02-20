from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('mark-all-read/', views.MarkAllReadView.as_view(), name='mark-all-read'),
]