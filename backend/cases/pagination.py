from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination, CursorPagination
from rest_framework.response import Response
from collections import OrderedDict
import math


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for most views
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination for large result sets (admin views, exports)
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination for small result sets (dropdowns, quick lists)
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LimitOffsetPaginationWithTotals(LimitOffsetPagination):
    """
    Limit-Offset pagination with total counts
    """
    default_limit = 20
    max_limit = 100
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.count),
            ('total_pages', math.ceil(self.count / self.limit) if self.limit else 1),
            ('current_offset', self.offset),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


class CaseCursorPagination(CursorPagination):
    """
    Cursor-based pagination for real-time feeds
    """
    page_size = 20
    ordering = '-created_at'
    cursor_query_param = 'cursor'


class CustomPagination:
    """
    Factory class to get appropriate pagination class based on view
    """
    
    @staticmethod
    def get_pagination_class(view_name, request):
        """
        Return appropriate pagination class based on view and request
        """
        # Check for export requests
        if 'export' in request.path:
            return LargeResultsSetPagination
        
        # Check for mobile clients
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        if 'mobile' in user_agent:
            return SmallResultsSetPagination
        
        # Default pagination based on view
        pagination_map = {
            'case-list': StandardResultsSetPagination,
            'case-search': LargeResultsSetPagination,
            'case-documents': SmallResultsSetPagination,
            'notifications': SmallResultsSetPagination,
        }
        
        return pagination_map.get(view_name, StandardResultsSetPagination)