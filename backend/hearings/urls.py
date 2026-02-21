from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.HearingViewSet, basename='hearing')

urlpatterns = [
    path('', include(router.urls)),
    
    # Hearing specific endpoints
    path('<uuid:pk>/confirm-attendance/', views.ConfirmAttendanceView.as_view(), name='confirm-attendance'),
    path('<uuid:pk>/cancel/', views.CancelHearingView.as_view(), name='cancel-hearing'),
    path('<uuid:pk>/complete/', views.CompleteHearingView.as_view(), name='complete-hearing'),
    path('<uuid:pk>/participants/', views.HearingParticipantsView.as_view(), name='hearing-participants'),
    path('<uuid:pk>/reschedule/', views.RescheduleHearingView.as_view(), name='reschedule-hearing'),
    path('<uuid:pk>/reminders/', views.HearingRemindersView.as_view(), name='hearing-reminders'),
    
    # Calendar views
    path('calendar/judge/<uuid:judge_id>/', views.JudgeCalendarView.as_view(), name='judge-calendar'),
    path('calendar/courtroom/<str:courtroom>/', views.CourtroomAvailabilityView.as_view(), name='courtroom-availability'),
    
    # Bulk operations
    path('bulk/schedule/', views.BulkScheduleHearingsView.as_view(), name='bulk-schedule'),
    
    # Reports
    path('reports/upcoming/', views.UpcomingHearingsReportView.as_view(), name='upcoming-hearings'),
    path('reports/judge-workload/', views.JudgeHearingWorkloadView.as_view(), name='judge-hearing-workload'),
]