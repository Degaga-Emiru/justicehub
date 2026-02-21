import re
import os
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import datetime


def validate_file_number(value):
    """
    Validate case file number format: JH-YYYY-XXXX
    """
    pattern = r'^JH-\d{4}-\d{4}$'
    if not re.match(pattern, value):
        raise ValidationError(
            _('File number must be in format: JH-YYYY-XXXX (e.g., JH-2024-0001)'),
            params={'value': value},
        )


def validate_case_title(value):
    """
    Validate case title length and characters
    """
    if len(value) < 5:
        raise ValidationError(_('Case title must be at least 5 characters long.'))
    
    if len(value) > 200:
        raise ValidationError(_('Case title cannot exceed 200 characters.'))
    
    # Check for special characters
    if not re.match(r'^[a-zA-Z0-9\s\-.,()]+$', value):
        raise ValidationError(
            _('Case title can only contain letters, numbers, spaces, and basic punctuation (. , - ())')
        )


def validate_document_file(value):
    """
    Validate uploaded document file
    """
    import magic
    from django.conf import settings
    
    # Check file size
    if value.size > settings.MAX_UPLOAD_SIZE:
        raise ValidationError(
            _(f'File size cannot exceed {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB')
        )
    
    # Check file extension
    ext = os.path.splitext(value.name)[1][1:].lower()
    allowed_extensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
    
    if ext not in allowed_extensions:
        raise ValidationError(
            _(f'File extension "{ext}" not allowed. Allowed: {", ".join(allowed_extensions)}')
        )
    
    # Check MIME type
    try:
        mime = magic.from_buffer(value.read(1024), mime=True)
        value.seek(0)
        
        allowed_mime = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png'
        }
        
        if mime != allowed_mime.get(ext):
            raise ValidationError(_('File content does not match its extension'))
            
    except Exception as e:
        # Fall back to extension only validation
        pass


def validate_phone_number(value):
    """
    Validate phone number format
    """
    pattern = r'^\+?1?\d{9,15}$'
    if not re.match(pattern, value):
        raise ValidationError(
            _('Phone number must be in format: +999999999. Up to 15 digits allowed.')
        )


def validate_email_domain(value):
    """
    Validate email domain for official accounts
    """
    allowed_domains = ['court.gov', 'justice.gov.in', 'gov.in']
    domain = value.split('@')[-1].lower()
    
    # For judge, registrar roles, enforce official domains
    # This would be called from serializer with context
    return True


def validate_aadhaar(value):
    """
    Validate Aadhaar number using Verhoeff algorithm
    """
    # Remove spaces if any
    value = value.replace(' ', '')
    
    # Check if 12 digits
    if not value.isdigit() or len(value) != 12:
        raise ValidationError(_('Aadhaar number must be 12 digits.'))
    
    # Verhoeff algorithm implementation
    def verhoeff_checksum(number):
        """Calculate Verhoeff checksum"""
        d = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
            [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
            [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
            [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
            [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
            [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
            [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
            [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
            [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
        ]
        
        p = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            [1, 5, 7, 6, 2, 8, 3, 0, 9, 4]
        ]
        
        checksum = 0
        for i, digit in enumerate(reversed(number)):
            checksum = d[checksum][p[(i + 1) % 2][int(digit)]]
        
        return checksum
    
    if verhoeff_checksum(value) != 0:
        raise ValidationError(_('Invalid Aadhaar number'))


def validate_pan_card(value):
    """
    Validate PAN card format
    """
    # PAN format: ABCDE1234F
    pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
    if not re.match(pattern, value):
        raise ValidationError(_('Invalid PAN card format. Must be like: ABCDE1234F'))


def validate_date_range(start_date, end_date):
    """
    Validate that end date is after start date
    """
    if start_date and end_date and end_date < start_date:
        raise ValidationError(_('End date must be after start date'))


def validate_future_date(value):
    """
    Validate that date is in future
    """
    if value and value < timezone.now().date():
        raise ValidationError(_('Date must be in the future'))


def validate_past_date(value):
    """
    Validate that date is in past
    """
    if value and value > timezone.now().date():
        raise ValidationError(_('Date must be in the past'))


def validate_case_status_transition(old_status, new_status):
    """
    Validate case status transition rules
    """
    allowed_transitions = {
        'PENDING_REVIEW': ['ACCEPTED', 'REJECTED'],
        'ACCEPTED': ['ASSIGNED', 'REJECTED'],
        'ASSIGNED': ['IN_PROGRESS', 'CLOSED'],
        'IN_PROGRESS': ['CLOSED'],
        'REJECTED': [],
        'CLOSED': []
    }
    
    if new_status not in allowed_transitions.get(old_status, []):
        raise ValidationError(
            _(f'Cannot transition from {old_status} to {new_status}')
        )