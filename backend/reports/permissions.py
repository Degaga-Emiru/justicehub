from rest_framework import permissions

class IsJudge(permissions.BasePermission):
    """
    Allows access only to users with the JUDGE role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'JUDGE')

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to users with the ADMIN role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')
