from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatSessionViewSet, AIReportJobViewSet, public_chat

router = DefaultRouter()
router.register(r'chat/sessions', ChatSessionViewSet, basename='chat-session')
router.register(r'reports/jobs', AIReportJobViewSet, basename='ai-report-job')

urlpatterns = [
    path('chat/public/', public_chat, name='public-chat'),
    path('', include(router.urls)),
]
