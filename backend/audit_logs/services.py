from django.utils import timezone
from .models import UserActionLog

def create_log(request=None, action_type=None, obj=None, description="", old_data=None, new_data=None, user=None):
    """
    Service function to create an audit log.
    
    Args:
        request: The current request object (to extract IP and user agent).
        action_type: One of UserActionLog.ActionType.
        obj: The object being acted upon.
        description: A human-readable description of the action.
        old_data: Dict of data before changes.
        new_data: Dict of data after changes.
        user: Explicit user if request is not available.
    """
    log_data = {
        'action_type': action_type,
        'description': description,
        'old_data': old_data,
        'new_data': new_data,
    }

    if request:
        if not user:
            log_data['user'] = request.user if request.user.is_authenticated else None
        else:
            log_data['user'] = user
        
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        log_data['ip_address'] = ip
        log_data['user_agent'] = request.META.get('HTTP_USER_AGENT')
    elif user:
        log_data['user'] = user

    if obj:
        log_data['model_name'] = obj.__class__.__name__
        if hasattr(obj, 'pk'):
            log_data['object_id'] = obj.pk
        log_data['object_repr'] = str(obj)

    return UserActionLog.objects.create(**log_data)
