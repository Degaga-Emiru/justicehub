from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    
    # Notification preferences
    path('preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('preferences/update/', views.UpdateNotificationPreferencesView.as_view(), name='update-preferences'),
    
    # Bulk operations
    path('mark-all-read/', views.MarkAllReadView.as_view(), name='mark-all-read'),
    path('archive-all/', views.ArchiveAllView.as_view(), name='archive-all'),
    path('delete-read/', views.DeleteReadNotificationsView.as_view(), name='delete-read'),
    
    # Statistics
    path('statistics/', views.NotificationStatisticsView.as_view(), name='notification-stats'),
    
    # Email test (admin only)
    path('test-email/', views.TestEmailView.as_view(), name='test-email'),
]