import django_filters
from django.db.models import Q
from .models import Case, CaseDocument, CaseCategory, JudgeAssignment


class CaseFilter(django_filters.FilterSet):
    """
    Filter set for Case model
    """
    # Search fields
    search = django_filters.CharFilter(method='search_filter')
    
    # Exact matches
    status = django_filters.CharFilter(field_name='status')
    priority = django_filters.CharFilter(field_name='priority')
    category = django_filters.UUIDFilter(field_name='category__id')
    category_name = django_filters.CharFilter(field_name='category__name', lookup_expr='icontains')
    
    # User filters
    created_by = django_filters.UUIDFilter(field_name='created_by__id')
    plaintiff = django_filters.UUIDFilter(field_name='plaintiff__id')
    defendant = django_filters.UUIDFilter(field_name='defendant__id')
    plaintiff_name = django_filters.CharFilter(method='plaintiff_name_filter')
    defendant_name = django_filters.CharFilter(method='defendant_name_filter')
    plaintiff_lawyer = django_filters.UUIDFilter(field_name='plaintiff_lawyer__id')
    defendant_lawyer = django_filters.UUIDFilter(field_name='defendant_lawyer__id')
    judge_name = django_filters.CharFilter(method='judge_name_filter')
    
    # Judge assignment
    assigned_judge = django_filters.UUIDFilter(method='judge_filter')
    has_judge = django_filters.BooleanFilter(method='has_judge_filter')
    
    # Date filters
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    created_at = django_filters.DateFromToRangeFilter()
    opened_at = django_filters.DateFromToRangeFilter(field_name='filing_date')
    
    # Boolean filters
    is_active = django_filters.BooleanFilter(method='active_filter')
    is_overdue = django_filters.BooleanFilter(method='overdue_filter')
    
    class Meta:
        model = Case
        fields = [
            'status', 'priority', 'category', 'created_by',
            'plaintiff', 'defendant', 'plaintiff_lawyer', 'defendant_lawyer',
            'payment_status'
        ]
    
    def search_filter(self, queryset, name, value):
        """Search by title, file number, description, or names"""
        return queryset.filter(
            Q(title__icontains=value) |
            Q(file_number__icontains=value) |
            Q(description__icontains=value) |
            Q(case_summary__icontains=value) |
            Q(plaintiff__first_name__icontains=value) |
            Q(plaintiff__last_name__icontains=value) |
            Q(defendant__first_name__icontains=value) |
            Q(defendant__last_name__icontains=value)
        )

    def plaintiff_name_filter(self, queryset, name, value):
        return queryset.filter(
            Q(plaintiff__first_name__icontains=value) |
            Q(plaintiff__last_name__icontains=value)
        )

    def defendant_name_filter(self, queryset, name, value):
        return queryset.filter(
            Q(defendant__first_name__icontains=value) |
            Q(defendant__last_name__icontains=value)
        )
    
    def judge_filter(self, queryset, name, value):
        """Filter cases by assigned judge"""
        return queryset.filter(
            judge_assignments__judge_id=value,
            judge_assignments__is_active=True
        )

    def judge_name_filter(self, queryset, name, value):
        """Filter cases by assigned judge name"""
        return queryset.filter(
            judge_assignments__judge__first_name__icontains=value,
            judge_assignments__is_active=True
        ) | queryset.filter(
            judge_assignments__judge__last_name__icontains=value,
            judge_assignments__is_active=True
        )
    
    def has_judge_filter(self, queryset, name, value):
        """Filter cases that have/not have assigned judge"""
        if value:
            return queryset.filter(judge_assignments__is_active=True).distinct()
        else:
            return queryset.exclude(judge_assignments__is_active=True)
    
    def active_filter(self, queryset, name, value):
        """Filter active/inactive cases"""
        active_statuses = ['ASSIGNED', 'IN_PROGRESS']
        if value:
            return queryset.filter(status__in=active_statuses)
        else:
            return queryset.exclude(status__in=active_statuses)
    
    def overdue_filter(self, queryset, name, value):
        """Filter overdue cases (based on expected resolution date)"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Consider cases older than 30 days in IN_PROGRESS as overdue
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        if value:
            return queryset.filter(
                status='IN_PROGRESS',
                created_at__lt=thirty_days_ago
            )
        else:
            return queryset.exclude(
                status='IN_PROGRESS',
                created_at__lt=thirty_days_ago
            )


class CaseDocumentFilter(django_filters.FilterSet):
    """
    Filter set for CaseDocument model
    """
    case = django_filters.UUIDFilter(field_name='case__id')
    case_number = django_filters.CharFilter(field_name='case__file_number', lookup_expr='icontains')
    document_type = django_filters.CharFilter(field_name='document_type')
    uploaded_by = django_filters.UUIDFilter(field_name='uploaded_by__id')
    file_type = django_filters.CharFilter(field_name='file_type')
    
    date_from = django_filters.DateFilter(field_name='uploaded_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='uploaded_at', lookup_expr='lte')
    
    is_confidential = django_filters.BooleanFilter(field_name='is_confidential')
    
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = CaseDocument
        fields = ['case', 'document_type', 'uploaded_by', 'file_type', 'is_confidential']
    
    def search_filter(self, queryset, name, value):
        """Search by file name"""
        return queryset.filter(file_name__icontains=value)


class JudgeAssignmentFilter(django_filters.FilterSet):
    """
    Filter set for JudgeAssignment model
    """
    judge = django_filters.UUIDFilter(field_name='judge__id')
    case = django_filters.UUIDFilter(field_name='case__id')
    assigned_by = django_filters.UUIDFilter(field_name='assigned_by__id')
    
    is_active = django_filters.BooleanFilter(field_name='is_active')
    
    assigned_date_from = django_filters.DateFilter(field_name='assigned_at', lookup_expr='gte')
    assigned_date_to = django_filters.DateFilter(field_name='assigned_at', lookup_expr='lte')
    
    class Meta:
        model = JudgeAssignment
        fields = ['judge', 'case', 'assigned_by', 'is_active']


class CaseCategoryFilter(django_filters.FilterSet):
    """
    Filter set for CaseCategory model
    """
    name = django_filters.CharFilter(lookup_expr='icontains')
    code = django_filters.CharFilter(lookup_expr='icontains')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    
    class Meta:
        model = CaseCategory
        fields = ['name', 'code', 'is_active']