from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF
    """
    response = exception_handler(exc, context)

    if response is None:
        if isinstance(exc, ValidationError):
            data = {
                'error': 'Validation Error',
                'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)
            }
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
            
        if isinstance(exc, BusinessLogicError):
            data = {
                'error': exc.code,
                'details': exc.message
            }
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
            
        if isinstance(exc, PermissionDeniedError):
            data = {
                'error': 'permission_denied',
                'details': exc.message
            }
            return Response(data, status=status.HTTP_403_FORBIDDEN)
            
        if isinstance(exc, ResourceNotFoundError):
            data = {
                'error': 'not_found',
                'details': exc.message
            }
            return Response(data, status=status.HTTP_404_NOT_FOUND)
        
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        data = {
            'error': 'Internal Server Error',
            'details': 'An unexpected error occurred. Please try again later.'
        }
        return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response


class BusinessLogicError(Exception):
    """Custom exception for business logic errors"""
    def __init__(self, message, code=None):
        self.message = message
        self.code = code or 'business_logic_error'
        super().__init__(self.message)


class PermissionDeniedError(Exception):
    """Custom exception for permission denied"""
    def __init__(self, message="You don't have permission to perform this action"):
        self.message = message
        super().__init__(self.message)


class ResourceNotFoundError(Exception):
    """Custom exception for resource not found"""
    def __init__(self, resource="Resource"):
        self.message = f"{resource} not found"
        super().__init__(self.message)