from rest_framework import permissions


class IsRegistrar(permissions.BasePermission):
    """
    Allows access only to registrars.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'CLERK', 'REGISTRAR']
        )


class IsJudge(permissions.BasePermission):
    """
    Allows access only to judges.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'JUDGE'
        )


class IsLawyer(permissions.BasePermission):
    """
    Allows access only to lawyers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'LAWYER'
        )


class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )


class IsAssignedJudge(permissions.BasePermission):
    """
    Allows access only to the judge assigned to the case.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Get case from object
        case = obj if isinstance(obj, Case) else getattr(obj, 'case', None)
        if not case:
            return False
        
        # Check if user is assigned judge
        active_assignment = case.judge_assignments.filter(is_active=True).first()
        return bool(active_assignment and active_assignment.judge == request.user)


class IsCaseOwner(permissions.BasePermission):
    """
    Allows access only to the case creator.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        case = obj if isinstance(obj, Case) else getattr(obj, 'case', None)
        if not case:
            return False
        
        return case.created_by == request.user


class CanReviewCases(permissions.BasePermission):
    """
    Allows registrars and admins to review cases.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'CLERK', 'REGISTRAR']
        )


class CanManageDocuments(permissions.BasePermission):
    """
    Permissions for document management.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Admin can do anything
        if request.user.role == 'ADMIN':
            return True
        
        # Uploader can manage their documents
        if hasattr(obj, 'uploaded_by') and obj.uploaded_by == request.user:
            return True
        
        # Assigned judge can view documents
        if request.user.role == 'JUDGE' and request.method in permissions.SAFE_METHODS:
            case = obj.case if hasattr(obj, 'case') else obj
            active_assignment = case.judge_assignments.filter(is_active=True).first()
            if active_assignment and active_assignment.judge == request.user:
                return True
        
        return False


class IsPartyToCase(permissions.BasePermission):
    """
    Allows access to parties involved in the case.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        case = obj if isinstance(obj, Case) else getattr(obj, 'case', None)
        if not case:
            return False
        
        return (
            case.created_by == request.user or
            case.plaintiff == request.user or
            case.defendant == request.user or
            case.plaintiff_lawyer == request.user or
            case.defendant_lawyer == request.user
        )