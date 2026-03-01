from rest_framework import permissions


class IsHearingJudge(permissions.BasePermission):
    """
    Allows access only to the judge presiding over the hearing.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        return obj.judge == request.user


class IsHearingParticipant(permissions.BasePermission):
    """
    Allows access to hearing participants.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Check if user is a participant
        return obj.participant_list.filter(user=request.user).exists()


class CanScheduleHearings(permissions.BasePermission):
    """
    Allows judges and admins to schedule hearings.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['JUDGE', 'ADMIN', 'CLERK', 'REGISTRAR']
        )


class CanConfirmAttendance(permissions.BasePermission):
    """
    Allows participants to confirm attendance.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        return obj.participant_list.filter(user=request.user).exists()


class CanViewHearing(permissions.BasePermission):
    """
    Permission for viewing hearing details.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Admin and judges can view all
        if request.user.role in ['ADMIN', 'JUDGE']:
            return True
        
        # Participants can view
        if obj.participant_list.filter(user=request.user).exists():
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