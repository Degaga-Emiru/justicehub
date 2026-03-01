from rest_framework import permissions


from decisions.models import Decision


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
    Allows registrars and admins to publish decisions.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in ['ADMIN', 'REGISTRAR']


class CanViewDecision(permissions.BasePermission):
    """
    Permission for viewing decisions.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Published decisions are public (or visible to all authenticated users)
        if obj.status == Decision.DecisionStatus.PUBLISHED or obj.is_published:
            return True
        
        # Admin, Registrar and the issuing judge can view unpublished/drafts
        if request.user.role in ['ADMIN', 'REGISTRAR']:
            return True
            
        if request.user.role == 'JUDGE' and obj.judge == request.user:
            return True
        
        return False


class IsPartyToDecision(permissions.BasePermission):
    """
    Allows access only to parties involved in the case for PUBLISHED decisions.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        if obj.status != Decision.DecisionStatus.PUBLISHED:
            return False
            
        case = obj.case
        return (
            case.created_by == request.user or
            case.plaintiff == request.user or
            case.defendant == request.user or
            case.plaintiff_lawyer == request.user or
            case.defendant_lawyer == request.user
        )
