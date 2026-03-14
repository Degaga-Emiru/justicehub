from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.HearingViewSet, basename='hearing')

urlpatterns = [
    path('create/', views.HearingViewSet.as_view({'post': 'create'}), name='hearing-create'),
    path('', include(router.urls)),
    
    # Administrative endpoints are handled by the router
    
    # Calendar views
    path('calendar/judge/<uuid:judge_id>/', views.JudgeCalendarView.as_view(), name='judge-calendar'),
    path('calendar/courtroom/<str:courtroom>/', views.CourtroomAvailabilityView.as_view(), name='courtroom-availability'),
    
    # Bulk operations
    path('bulk/schedule/', views.BulkScheduleHearingsView.as_view(), name='bulk-schedule'),
    
    # Reports
    path('reports/upcoming/', views.UpcomingHearingsReportView.as_view(), name='upcoming-hearings'),
    path('reports/judge-workload/', views.JudgeHearingWorkloadView.as_view(), name='judge-hearing-workload'),
]