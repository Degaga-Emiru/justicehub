import uuid
import hashlib
import os
import random
import string
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.files.storage import default_storage
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def generate_case_number(case_id=None):
    """
    Generate unique case number in format: JH-YYYY-XXXX
    """
    from .models import Case
    
    current_year = datetime.now().year
    prefix = f"JH-{current_year}"
    
    # Get the last case number for current year
    last_case = Case.objects.filter(
        file_number__startswith=prefix
    ).order_by('-file_number').first()
    
    if last_case and last_case.file_number:
        try:
            last_sequence = int(last_case.file_number.split('-')[-1])
            new_sequence = last_sequence + 1
        except (ValueError, IndexError):
            new_sequence = 1
    else:
        new_sequence = 1
    
    return f"{prefix}-{new_sequence:04d}"


def generate_document_checksum(file):
    """
    Generate SHA-256 checksum for uploaded file
    """
    sha256 = hashlib.sha256()
    
    # Read file in chunks to handle large files
    for chunk in file.chunks():
        sha256.update(chunk)
    
    return sha256.hexdigest()


def get_file_size_display(size_in_bytes):
    """
    Convert file size to human readable format
    """
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.1f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.1f} TB"


def get_unique_file_path(instance, filename):
    """
    Generate unique file path for uploaded files
    """
    ext = filename.split('.')[-1]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    new_filename = f"{timestamp}_{random_string}.{ext}"
    
    # Organize by year/month
    year_month = datetime.now().strftime('%Y/%m')
    return f"cases/{year_month}/{new_filename}"


def calculate_case_duration(case):
    """
    Calculate case duration in days
    """
    if case.closed_date:
        return (case.closed_date - case.filing_date).days
    return (timezone.now() - case.filing_date).days


def get_case_status_color(status):
    """
    Get color code for case status (for UI)
    """
    colors = {
        'PENDING_REVIEW': '#f39c12',  # Orange
        'ACCEPTED': '#3498db',         # Blue
        'REJECTED': '#e74c3c',         # Red
        'ASSIGNED': '#9b59b6',         # Purple
        'IN_PROGRESS': '#2ecc71',       # Green
        'CLOSED': '#95a5a6',            # Gray
    }
    return colors.get(status, '#333333')


def get_case_priority_color(priority):
    """
    Get color code for case priority
    """
    colors = {
        'LOW': '#27ae60',      # Green
        'MEDIUM': '#f39c12',   # Orange
        'HIGH': '#e67e22',     # Dark Orange
        'URGENT': '#e74c3c',   # Red
    }
    return colors.get(priority, '#333333')


def send_case_status_notification(case, old_status, new_status):
    """
    Send notifications for case status changes
    """
    from notifications.services import create_notification
    
    status_messages = {
        'ACCEPTED': f'Your case {case.file_number} has been accepted',
        'REJECTED': f'Your case {case.title} has been rejected',
        'ASSIGNED': f'A judge has been assigned to your case {case.file_number}',
        'CLOSED': f'Your case {case.file_number} has been closed',
    }
    
    if new_status in status_messages:
        create_notification(
            user=case.created_by,
            type=f'CASE_{new_status}',
            title=f'Case {new_status.replace("_", " ").title()}',
            message=status_messages[new_status],
            case=case,
            priority='HIGH' if new_status in ['REJECTED', 'CLOSED'] else 'MEDIUM'
        )


def log_case_action(user, case, action, details=None, request=None):
    """
    Log case-related actions for audit
    """
    from .models import UserActionLog
    
    UserActionLog.objects.create(
        user=user,
        action=action,
        entity_type='Case',
        entity_id=case.id,
        details=details or {},
        ip_address=request.META.get('REMOTE_ADDR') if request else None
    )


def check_case_permission(user, case, permission_type):
    """
    Check if user has permission for case action
    """
    if user.role == 'ADMIN':
        return True
    
    permissions = {
        'view': (
            user.role in ['JUDGE', 'REGISTRAR'] or
            case.created_by == user or
            case.plaintiff == user or
            case.defendant == user or
            case.plaintiff_lawyer == user or
            case.defendant_lawyer == user
        ),
        'edit': (
            user.role in ['JUDGE', 'REGISTRAR'] or
            case.created_by == user
        ),
        'delete': user.role == 'ADMIN',
        'assign_judge': user.role in ['ADMIN', 'REGISTRAR'],
        'review': user.role in ['ADMIN', 'REGISTRAR'],
    }
    
    return permissions.get(permission_type, False)


def get_case_timeline_events(case):
    """
    Generate timeline events for case
    """
    events = []
    
    # Case creation
    events.append({
        'date': case.created_at,
        'event_type': 'CASE_CREATED',
        'title': 'Case Filed',
        'description': f'Case filed by {case.created_by.get_full_name()}',
        'user': case.created_by.get_full_name(),
        'icon': 'file-text'
    })
    
    # Document uploads
    for doc in case.documents.all():
        events.append({
            'date': doc.uploaded_at,
            'event_type': 'DOCUMENT_UPLOADED',
            'title': 'Document Uploaded',
            'description': f'{doc.file_name} uploaded',
            'user': doc.uploaded_by.get_full_name(),
            'icon': 'file'
        })
    
    # Review events
    if case.reviewed_at:
        event_type = 'CASE_ACCEPTED' if case.status == 'ACCEPTED' else 'CASE_REJECTED'
        title = 'Case Accepted' if case.status == 'ACCEPTED' else 'Case Rejected'
        icon = 'check-circle' if case.status == 'ACCEPTED' else 'x-circle'
        
        events.append({
            'date': case.reviewed_at,
            'event_type': event_type,
            'title': title,
            'description': f'Case reviewed by {case.reviewed_by.get_full_name()}',
            'user': case.reviewed_by.get_full_name(),
            'icon': icon
        })
    
    # Judge assignments
    for assignment in case.judge_assignments.all():
        events.append({
            'date': assignment.assigned_at,
            'event_type': 'JUDGE_ASSIGNED',
            'title': 'Judge Assigned',
            'description': f'Judge {assignment.judge.get_full_name()} assigned',
            'user': assignment.assigned_by.get_full_name(),
            'icon': 'user'
        })
    
    # Sort by date
    events.sort(key=lambda x: x['date'], reverse=True)
    
    return events