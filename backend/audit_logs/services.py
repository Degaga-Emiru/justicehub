from django.contrib.contenttypes.models import ContentType
from .models import AuditLog

def create_audit_log(
    request=None, 
    action_type=None, 
    action_status=AuditLog.ActionStatus.SUCCESS,
    obj=None, 
    description="", 
    changes=None, 
    user=None,
    entity_name=None,
    is_suspicious=False
):
    """
    Comprehensive service function to create an audit log.
    
    Automatically captures:
    - Request metadata (IP, UA, path, method)
    - ContentType and entity ID
    - User email and role snapshots
    - Field-level changes
    - Security suspicious flags
    """
    log_data = {
        'action_type': action_type,
        'action_status': action_status,
        'description': description,
        'changes': changes,
        'is_suspicious': is_suspicious,
    }

    # Capture User and Request Metadata
    final_user = user
    if request:
        if not final_user and request.user.is_authenticated:
            final_user = request.user
            
        # Metadata
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        log_data['ip_address'] = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        log_data['user_agent'] = request.META.get('HTTP_USER_AGENT')
        log_data['request_method'] = request.method
        log_data['request_path'] = request.path

    if final_user:
        log_data['user'] = final_user
        log_data['user_email'] = final_user.email
        log_data['user_role'] = getattr(final_user, 'role', None)

    # Capture Entity details
    if obj:
        log_data['content_type'] = ContentType.objects.get_for_model(obj)
        if hasattr(obj, 'pk'):
            log_data['object_id'] = obj.pk
        
        # Resolve entity name (reference)
        if entity_name:
            log_data['entity_name'] = entity_name
        elif hasattr(obj, 'file_number'):
            log_data['entity_name'] = obj.file_number
        elif hasattr(obj, 'decision_number'):
            log_data['entity_name'] = obj.decision_number
        else:
            log_data['entity_name'] = str(obj)

    return AuditLog.objects.create(**log_data)

def track_model_changes(old_instance, new_instance, fields_to_track):
    """
    Utility to diff model fields.
    Returns a dict: {"field": {"old": val, "new": val}}
    """
    changes = {}
    for field in fields_to_track:
        old_val = getattr(old_instance, field)
        new_val = getattr(new_instance, field)
        if old_val != new_val:
            changes[field] = {
                "old": str(old_val) if old_val is not None else None,
                "new": str(new_val) if new_val is not None else None
            }
    return changes if changes else None
