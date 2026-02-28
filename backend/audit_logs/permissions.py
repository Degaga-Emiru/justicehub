from rest_framework import permissions

class AuditLogPermission(permissions.BasePermission):
    """
    Role-based permissions for audit logs:
    - ADMIN: Can view all logs.
    - REGISTRAR: Can view case-related logs.
    - JUDGE: Can view logs for cases assigned to them.
    - CLIENT: Cannot view logs.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'ADMIN':
            return True
            
        if request.user.role in ['REGISTRAR', 'CLERK', 'JUDGE']:
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if user.role == 'ADMIN':
            return True
            
        if user.role in ['REGISTRAR', 'CLERK']:
            # Registrars can see all case logs
            return obj.model_name in ['Case', 'CaseDocument', 'JudgeAssignment']
            
        if user.role == 'JUDGE':
            # Judges see logs for their assigned cases
            if obj.model_name == 'Case':
                from cases.models import JudgeAssignment
                return JudgeAssignment.objects.filter(
                    case_id=obj.object_id,
                    judge=user,
                    is_active=True
                ).exists()
            # Simplified: if it's related to a case they are assigned to
            return False # Further filtering in get_queryset
            
        return False
