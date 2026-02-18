from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Allows access only to admin users."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')


class IsLawyer(permissions.BasePermission):
    """Allows access only to lawyers."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'LAWYER')


class IsJudge(permissions.BasePermission):
    """Allows access only to judges."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'JUDGE')


class IsClerk(permissions.BasePermission):
    """Allows access only to court clerks."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'CLERK')


class IsDefendant(permissions.BasePermission):
    """Allows access only to defendants."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'DEFENDANT')


class IsCitizen(permissions.BasePermission):
    """Allows access only to citizens."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'CITIZEN')


class IsOwnerOrAdmin(permissions.BasePermission):
    """Object-level permission to allow owners or admins to edit."""
    
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.role == 'ADMIN':
            return True
        
        # Check if the object has a user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'email'):
            return obj == request.user
        
        return False


class CanManageCases(permissions.BasePermission):
    """Allows case management based on role."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admin and Clerk can create/manage cases
        if request.user.role in ['ADMIN', 'CLERK']:
            return True
        
        # Judges can view assigned cases
        if request.user.role == 'JUDGE' and request.method in permissions.SAFE_METHODS:
            return True
        
        # Lawyers can view assigned cases
        if request.user.role == 'LAWYER' and request.method in permissions.SAFE_METHODS:
            return True
        
        return False


class CanIssueDecisions(permissions.BasePermission):
    """Only judges can issue decisions on cases."""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                   request.user.role in ['ADMIN', 'JUDGE'])


class CanViewOwnData(permissions.BasePermission):
    """Defendants and citizens can only view their own data."""
    
    def has_object_permission(self, request, view, obj):
        if request.user.role in ['ADMIN', 'JUDGE', 'CLERK', 'LAWYER']:
            return True
        
        # For Defendant and Citizen
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'email'):
            return obj == request.user
        
        return False