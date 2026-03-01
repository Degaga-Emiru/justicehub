import csv
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q, Max, Sum
from django.db.models.functions import TruncDate, ExtractHour
from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
from rest_framework import viewsets, mixins, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import AuditLog
from .serializers import AuditLogSerializer
from .permissions import AuditLogPermission, IsAdminUser, IsAdminOrRegistrar

class AuditLogViewSet(viewsets.ModelViewSet):
    """
    Comprehensive ViewSet for Audit Logs.
    Implements all required monitoring and compliance endpoints.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, AuditLogPermission]
    
    def get_queryset(self):
        user = self.request.user
        qs = AuditLog.objects.all().select_related('user', 'content_type')
        
        if user.role == 'ADMIN':
            return qs
            
        if user.role in ['REGISTRAR', 'CLERK']:
            # Registrars see public/official actions
            return qs.filter(
                Q(action_type__startswith='CASE_') |
                Q(action_type__startswith='DOCUMENT_') |
                Q(action_type__startswith='HEARING_') |
                Q(action_type__startswith='DECISION_')
            )
            
        # Default: Users see only their own trail
        return qs.filter(user=user)

    def list(self, request, *args, **kwargs):
        """Standard paginated list with admin filters"""
        if request.user.role != 'ADMIN':
            # Non-admins get their trail unless they use specific endpoints
            return super().list(request, *args, **kwargs)
            
        qs = self.get_queryset()
        
        # Filtering
        user_id = request.query_params.get('user_id')
        action_type = request.query_params.get('action_type')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        entity_type = request.query_params.get('entity_type') # Format "app.model"
        entity_id = request.query_params.get('entity_id')
        search = request.query_params.get('search')
        
        if user_id:
            qs = qs.filter(user_id=user_id)
        if action_type:
            qs = qs.filter(action_type=action_type)
        if date_from:
            qs = qs.filter(timestamp__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__lte=date_to)
        if entity_type:
            try:
                app_label, model = entity_type.split('.')
                ct = ContentType.objects.get(app_label=app_label, model=model)
                qs = qs.filter(content_type=ct)
            except (ValueError, ContentType.DoesNotExist):
                pass
        if entity_id:
            qs = qs.filter(object_id=entity_id)
        if search:
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(user_email__icontains=search) |
                Q(ip_address__icontains=search) |
                Q(entity_name__icontains=search)
            )
            
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def user_trail(self, request):
        """Return audit trail for current user"""
        days = request.query_params.get('days')
        qs = AuditLog.objects.filter(user=request.user)
        
        if days:
            cutoff = timezone.now() - timedelta(days=int(days))
            qs = qs.filter(timestamp__gte=cutoff)
            
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrRegistrar])
    def entity_trail(self, request):
        """Return logs for specific entity"""
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        
        if not entity_type or not entity_id:
            return Response({"error": "entity_type and entity_id required"}, status=400)
            
        try:
            app_label, model = entity_type.split('.')
            ct = ContentType.objects.get(app_label=app_label, model=model)
            qs = AuditLog.objects.filter(content_type=ct, object_id=entity_id)
            
            page = self.paginate_queryset(qs)
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        except (ValueError, ContentType.DoesNotExist):
            return Response({"error": "Invalid entity_type"}, status=400)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrRegistrar])
    def recent(self, request):
        """Real-time recent activity feed"""
        limit = int(request.query_params.get('limit', 10))
        action_types = request.query_params.getlist('action_types')
        
        qs = self.get_queryset()
        if action_types:
            qs = qs.filter(action_type__in=action_types)
            
        qs = qs[:limit]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def statistics(self, request):
        """Return totals and grouped counts"""
        days = int(request.query_params.get('days', 7))
        cutoff = timezone.now() - timedelta(days=days)
        
        base_qs = AuditLog.objects.filter(timestamp__gte=cutoff)
        
        stats = {
            "total_logs": AuditLog.objects.count(),
            "period_total": base_qs.count(),
            "by_action_type": base_qs.values('action_type').annotate(count=Count('id')).order_by('-count'),
            "by_user_role": base_qs.values('user_role').annotate(count=Count('id')).order_by('-count'),
            "daily_counts": base_qs.annotate(date=TruncDate('timestamp')).values('date').annotate(count=Count('id')).order_by('date')
        }
        return Response(stats)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def export_csv(self, request):
        """Export logs as CSV"""
        qs = self.get_queryset() # Could apply same filters as list if needed
        
        response = HttpResponse(content_type='text/csv')
        today = timezone.now().strftime('%Y-%m-%d')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{today}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Timestamp', 'User', 'Role', 'Action', 'Status', 'Description', 'Entity', 'IP'])
        
        for log in qs[:5000]: # Limit for performance
            writer.writerow([
                log.id, log.timestamp, log.user_email, log.user_role,
                log.action_type, log.action_status, log.description,
                log.entity_name, log.ip_address
            ])
            
        return response

    @action(detail=False, methods=['delete'], permission_classes=[IsAdminUser])
    def purge_old(self, request):
        """Permanently delete logs older than X days"""
        days = request.data.get('days')
        if days is None:
            return Response({"error": "days parameter required"}, status=400)
            
        cutoff = timezone.now() - timedelta(days=int(days))
        old_logs = AuditLog.objects.filter(timestamp__lt=cutoff)
        count = old_logs.count()
        
        # force_purge=True is required by model override
        for log in old_logs:
            log.delete(force_purge=True)
            
        return Response({"deleted_count": count}, status=200)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def summaries(self, request):
        """Daily summary report"""
        today = timezone.now().date()
        qs = AuditLog.objects.filter(timestamp__date=today)
        
        summary = {
            "date": today,
            "total_actions": qs.count(),
            "unique_users": qs.values('user').distinct().count(),
            "action_counts": {item['action_type']: item['count'] for item in qs.values('action_type').annotate(count=Count('id'))},
            "role_counts": {item['user_role']: item['count'] for item in qs.values('user_role').annotate(count=Count('id'))},
            "peak_hour": qs.annotate(hour=ExtractHour('timestamp')).values('hour').annotate(count=Count('id')).order_by('-count').first()['hour'] if qs.exists() else None
        }
        return Response(summary)
