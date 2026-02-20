from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.HearingViewSet, basename='hearing')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:pk>/confirm-attendance/', views.ConfirmAttendanceView.as_view(), name='confirm-attendance'),
]