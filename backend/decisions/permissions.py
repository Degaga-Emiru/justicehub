from rest_framework import permissions


class IsDecisionJudge(permissions.BasePermission):
    """
    Allows access only to the judge who issued the decision.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'JUDGE'

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        return obj.judge == request.user


class CanPublishDecision(permissions.BasePermission):
    """
    Allows judges and admins to publish decisions.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        if request.user.role == 'ADMIN':
            return True
        
        return obj.judge == request.user


class CanViewDecision(permissions.BasePermission):
    """
    Permission for viewing decisions.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Published decisions are public
        if obj.is_published:
            return True
        
        # Admin and judge can view unpublished
        if request.user.role in ['ADMIN', 'JUDGE']:
            return True
        
        # Case parties can view
        case = obj.case
        return (
            case.created_by == request.user or
            case.plaintiff == request.user or
            case.defendant == request.user or
            case.plaintiff_lawyer == request.user or
            case.defendant_lawyer == request.user
        )


class IsPartyToDecision(permissions.BasePermission):
    """
    Allows access to parties involved in the decision.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        case = obj.case
        return (
            case.created_by == request.user or
            case.plaintiff == request.user or
            case.defendant == request.user or
            case.plaintiff_lawyer == request.user or
            case.defendant_lawyer == request.user
        )