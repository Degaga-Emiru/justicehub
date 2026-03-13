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
        
        if request.user.role in ['ADMIN', 'REGISTRAR']:
            return True
        
        return request.user.role == 'JUDGE' and obj.judge == request.user


class CanViewDecision(permissions.BasePermission):
    """
    Permission for viewing decisions.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
            
        # Admin and Registrar can view any decision
        if request.user.role in ['ADMIN', 'REGISTRAR']:
            return True
        
        # Judges can view ONLY decisions for cases they are actively assigned to
        if request.user.role == 'JUDGE':
            from cases.models import JudgeAssignment
            return JudgeAssignment.objects.filter(
                judge=request.user, 
                case=obj.case, 
                is_active=True
            ).exists()
            
        # Clients/Parties can ONLY view published decisions for their cases
        if obj.status == Decision.DecisionStatus.PUBLISHED or obj.is_published:
            case = obj.case
            return (
                case.created_by == request.user or
                case.plaintiff == request.user or
                case.defendant == request.user or
                case.plaintiff_lawyer == request.user or
                case.defendant_lawyer == request.user
            )
            
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
