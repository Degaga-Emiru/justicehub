from django.urls import path
from . import views

urlpatterns = [
    path('', views.HearingViewSet.as_view({'get': 'list'}), name='citizen-hearings-list'),
    path('<uuid:pk>/', views.HearingViewSet.as_view({'get': 'retrieve'}), name='citizen-hearing-detail'),
    path('<uuid:pk>/confirm-attendance/', views.HearingViewSet.as_view({'post': 'confirm_attendance'}), name='citizen-confirm-attendance'),
    path('<uuid:pk>/decline-attendance/', views.HearingViewSet.as_view({'post': 'decline_attendance'}), name='citizen-decline-attendance'),
]
