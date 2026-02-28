from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import UserActionLog
from .serializers import UserActionLogSerializer
from .permissions import AuditLogPermission

class UserActionLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    ViewSet for viewing audit logs.
    Logs are read-only and restricted by role.
    """
    queryset = UserActionLog.objects.all().select_related('user')
    serializer_class = UserActionLogSerializer
    permission_classes = [IsAuthenticated, AuditLogPermission]
    
    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        
        if user.role == 'ADMIN':
            return qs
            
        if user.role in ['REGISTRAR', 'CLERK']:
            # See only case-related logs
            return qs.filter(model_name__in=['Case', 'CaseDocument', 'JudgeAssignment', 'Decision'])
            
        if user.role == 'JUDGE':
            # See only logs for assigned cases
            from cases.models import JudgeAssignment
            assigned_case_ids = JudgeAssignment.objects.filter(
                judge=user,
                is_active=True
            ).values_list('case_id', flat=True)
            
            return qs.filter(
                Q(model_name='Case', object_id__in=assigned_case_ids) |
                Q(model_name='Decision', user=user) | # Their own decisions
                Q(user=user) # Their own actions
            )
            
        return qs.none()
