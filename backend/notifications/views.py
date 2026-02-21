from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer, NotificationMarkReadSerializer,
    NotificationPreferenceSerializer
)
from .services import create_notification


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).select_related('case')
    
    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """
        Mark notifications as read
        """
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if serializer.validated_data.get('mark_all'):
            # Mark all as read
            updated = Notification.objects.filter(
                user=request.user,
                is_read=False
            ).update(
                is_read=True,
                read_at=timezone.now()
            )
            return Response({'marked_read': updated})
        
        notification_ids = serializer.validated_data.get('notification_ids', [])
        if notification_ids:
            updated = Notification.objects.filter(
                id__in=notification_ids,
                user=request.user
            ).update(
                is_read=True,
                read_at=timezone.now()
            )
            return Response({'marked_read': updated})
        
        return Response({'marked_read': 0})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Get count of unread notifications
        """
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        Archive a notification
        """
        notification = self.get_object()
        notification.is_archived = True
        notification.save()
        return Response({'status': 'archived'})


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """
    View for managing notification preferences
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        pref, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return pref


class MarkAllReadView(generics.GenericAPIView):
    """
    Mark all notifications as read
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        updated = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'marked_read': updated})