from rest_framework import viewsets, status, generics, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer, NotificationMarkReadSerializer,
    NotificationPreferenceSerializer, NotificationStatisticsSerializer
)
from .services import create_notification
import logging

logger = logging.getLogger(__name__)


class NotificationViewSet(mixins.RetrieveModelMixin,
                          mixins.ListModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    """
    ViewSet for viewing and deleting notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'type']
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).select_related('case').order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Delete multiple notifications at once
        """
        notification_ids = request.data.get('notification_ids', [])
        if not notification_ids:
            return Response({'error': 'No notification IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted = Notification.objects.filter(
            id__in=notification_ids,
            user=request.user
        ).delete()
        
        return Response({'deleted': deleted[0]})

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
    
    @action(detail=False, methods=['delete'])
    def delete_read(self, request):
        """
        Delete all read notifications
        """
        deleted = Notification.objects.filter(
            user=request.user,
            is_read=True
        ).delete()
        return Response({'deleted': deleted[0]})
    
    @action(detail=False, methods=['post'])
    def archive_all(self, request):
        """
        Archive all notifications
        """
        updated = Notification.objects.filter(
            user=request.user
        ).update(is_archived=True)
        return Response({'archived': updated})
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get notification statistics
        """
        user = request.user
        
        total = Notification.objects.filter(user=user).count()
        unread = Notification.objects.filter(user=user, is_read=False).count()
        by_type = list(Notification.objects.filter(user=user).values('type').annotate(
            count=Count('id')
        ))
        by_priority = list(Notification.objects.filter(user=user).values('priority').annotate(
            count=Count('id')
        ))
        
        data = {
            'total': total,
            'unread': unread,
            'read_percentage': (total - unread) / total * 100 if total > 0 else 0,
            'by_type': by_type,
            'by_priority': by_priority
        }
        serializer = NotificationStatisticsSerializer(data)
        return Response(serializer.data)


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
    
    def patch(self, request, *args, **kwargs):
        """Partial update of preferences"""
        return self.partial_update(request, *args, **kwargs)


class UpdateNotificationPreferencesView(generics.UpdateAPIView):
    """
    View for updating notification preferences (alternative endpoint)
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        pref, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return pref
    
    def post(self, request, *args, **kwargs):
        """Handle POST requests for updating preferences"""
        return self.update(request, *args, **kwargs)


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


class ArchiveAllView(generics.GenericAPIView):
    """
    Archive all notifications
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        updated = Notification.objects.filter(
            user=request.user
        ).update(is_archived=True)
        return Response({'archived': updated})


class DeleteReadNotificationsView(generics.GenericAPIView):
    """
    Delete all read notifications
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        deleted = Notification.objects.filter(
            user=request.user,
            is_read=True
        ).delete()
        return Response({'deleted': deleted[0]})


class NotificationStatisticsView(generics.GenericAPIView):
    """
    Get notification statistics
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        total = Notification.objects.filter(user=user).count()
        unread = Notification.objects.filter(user=user, is_read=False).count()
        
        by_type = Notification.objects.filter(user=user).values('type').annotate(
            count=Count('id')
        )
        
        by_priority = Notification.objects.filter(user=user).values('priority').annotate(
            count=Count('id')
        )
        
        data = {
            'total': total,
            'unread': unread,
            'read_percentage': (total - unread) / total * 100 if total > 0 else 0,
            'by_type': by_type,
            'by_priority': by_priority
        }
        
        return Response(data)


class TestEmailView(generics.GenericAPIView):
    """
    Test email sending (admin only)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if not request.user.role == 'ADMIN':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from core.utils.email import send_email_template
        
        success = send_email_template(
            subject='Test Email from Justice Hub',
            template_name='email/test.html',
            context={'user': request.user},
            recipient_list=[request.user.email]
        )
        
        if success:
            return Response({'message': 'Test email sent successfully'})
        else:
            return Response(
                {'error': 'Failed to send email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )