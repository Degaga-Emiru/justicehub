from django.urls import path
from . import views

urlpatterns = [
    path('', views.HearingViewSet.as_view({'get': 'list'}), name='judge-hearings-list'),
    path('<uuid:pk>/record-attendance/', views.HearingViewSet.as_view({'post': 'record_attendance'}), name='judge-record-attendance'),
    path('<uuid:pk>/attendance/<uuid:user_id>/', views.HearingViewSet.as_view({'patch': 'single_attendance'}), name='judge-single-attendance'),
]
