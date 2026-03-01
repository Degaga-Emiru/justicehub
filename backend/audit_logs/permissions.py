from rest_framework import permissions

class AuditLogPermission(permissions.BasePermission):
    """
    Role-based permissions for audit logs:
    - ADMIN: Can view all logs, stats, and perform purge/export.
    - REGISTRAR: Can view case-related logs and recent activity.
    - AUTHENTICATED USER: Can view their own trail.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Admin has full access
        if request.user.role == 'ADMIN':
            return True
        
        # Other roles have restricted access (handled in get_queryset or specific methods)
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if user.role == 'ADMIN':
            return True
            
        # Users can only see their own logs
        if obj.user == user:
            return True
            
        # Registrars can see case/document/hearing/decision logs
        if user.role in ['REGISTRAR', 'CLERK']:
            return obj.action_type in [
                'CASE_CREATED', 'CASE_UPDATED', 'CASE_ACCEPTED', 'CASE_REJECTED', 
                'CASE_ASSIGNED', 'CASE_STATUS_CHANGED', 'CASE_VIEWED',
                'DOCUMENT_UPLOADED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_VIEWED',
                'HEARING_SCHEDULED', 'HEARING_UPDATED', 'HEARING_CANCELLED',
                'DECISION_CREATED', 'DECISION_PUBLISHED'
            ]
            
        return False

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'

class IsAdminOrRegistrar(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ADMIN', 'REGISTRAR', 'CLERK']
