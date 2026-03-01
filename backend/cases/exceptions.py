from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import IntegrityError
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for cases app
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If response is None, it's an unhandled exception
    if response is None:
        if isinstance(exc, ValidationError):
            data = {
                'error': 'Validation Error',
                'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)
            }
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        elif isinstance(exc, PermissionDenied):
            data = {
                'error': 'Permission Denied',
                'details': str(exc)
            }
            return Response(data, status=status.HTTP_403_FORBIDDEN)
        
        elif isinstance(exc, IntegrityError):
            data = {
                'error': 'Database Integrity Error',
                'details': 'A record with this information already exists.'
            }
            return Response(data, status=status.HTTP_409_CONFLICT)
        
        # Log unhandled exceptions
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        
        data = {
            'error': 'Internal Server Error',
            'details': 'An unexpected error occurred. Please try again later.'
        }
        return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Customize DRF's default error responses
    if response.status_code == status.HTTP_400_BAD_REQUEST:
        response.data = {
            'error': 'Bad Request',
            'details': response.data
        }
    
    elif response.status_code == status.HTTP_401_UNAUTHORIZED:
        response.data = {
            'error': 'Authentication Failed',
            'details': response.data.get('detail', 'Invalid or missing authentication credentials.')
        }
    
    elif response.status_code == status.HTTP_403_FORBIDDEN:
        response.data = {
            'error': 'Permission Denied',
            'details': response.data.get('detail', 'You do not have permission to perform this action.')
        }
    
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        response.data = {
            'error': 'Not Found',
            'details': response.data.get('detail', 'The requested resource was not found.')
        }
    
    return response


class CaseException(Exception):
    """Base exception for case-related errors"""
    def __init__(self, message, code=None):
        self.message = message
        self.code = code or 'case_error'
        super().__init__(self.message)


class CaseNotFoundException(CaseException):
    """Exception raised when case is not found"""
    def __init__(self, case_id):
        self.message = f"Case with id {case_id} not found"
        self.code = 'case_not_found'
        super().__init__(self.message, self.code)


class CaseValidationException(CaseException):
    """Exception raised for case validation errors"""
    def __init__(self, message):
        self.message = message
        self.code = 'case_validation_error'
        super().__init__(self.message, self.code)


class CasePermissionException(CaseException):
    """Exception raised for permission errors"""
    def __init__(self, message="You don't have permission to perform this action"):
        self.message = message
        self.code = 'case_permission_denied'
        super().__init__(self.message, self.code)


class JudgeAssignmentException(CaseException):
    """Exception raised for judge assignment errors"""
    def __init__(self, message):
        self.message = message
        self.code = 'judge_assignment_error'
        super().__init__(self.message, self.code)


class DocumentException(CaseException):
    """Exception raised for document-related errors"""
    def __init__(self, message):
        self.message = message
        self.code = 'document_error'
        super().__init__(self.message, self.code)


class CaseStatusTransitionException(CaseException):
    """Exception raised for invalid status transitions"""
    def __init__(self, from_status, to_status):
        self.message = f"Cannot transition case from {from_status} to {to_status}"
        self.code = 'invalid_status_transition'
        super().__init__(self.message, self.code)


def handle_case_exception(func):
    """
    Decorator to handle case exceptions uniformly
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except CaseException as e:
            logger.warning(f"Case exception: {e.message}")
            return {
                'error': e.code,
                'message': e.message
            }, 400
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}", exc_info=True)
            return {
                'error': 'unexpected_error',
                'message': 'An unexpected error occurred'
            }, 500
    return wrapper