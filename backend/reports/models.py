import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Report(models.Model):
    REPORT_TYPE_CHOICES = [
        ('system_overview', 'System Overview'),
        ('judge_report', 'Judge Report'),
        ('financial_report', 'Financial Report'),
        ('case_status_report', 'Case Status Report'),
        ('case_distribution_report', 'Case Distribution Report'),
        ('performance_report', 'Performance Report'),
        ('case_intelligence_report', 'Case Intelligence Report'),
    ]

    REPORT_CATEGORY_CHOICES = [
        ('system_report', 'System Report'),
        ('judge_report', 'Judge Report'),
        ('financial_report', 'Financial Report'),
        ('analytics_report', 'Analytics Report'),
        ('performance_report', 'Performance Report'),
    ]

    PERIOD_TYPE_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
        ('custom_range', 'Custom Range'),
        ('last_x_days', 'Last X Days'),
    ]

    FILE_FORMAT_CHOICES = [
        ('json', 'JSON'),
        ('csv', 'CSV'),
        ('pdf', 'PDF'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    # Core Identification Fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    report_category = models.CharField(max_length=50, choices=REPORT_CATEGORY_CHOICES)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    generated_for_role = models.CharField(max_length=50)

    # Report Period Fields
    report_period_type = models.CharField(max_length=50, choices=PERIOD_TYPE_CHOICES)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    days_parameter = models.IntegerField(null=True, blank=True)

    # Filtering and Scope Fields
    judge = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='judge_specific_reports')
    case_type = models.CharField(max_length=100, null=True, blank=True)
    case_status = models.CharField(max_length=50, null=True, blank=True)
    registrar = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='registrar_reports')

    # File and Export Fields
    file_format = models.CharField(max_length=10, choices=FILE_FORMAT_CHOICES)
    file = models.FileField(upload_to='reports/%Y/%m/%d/', null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    storage_path = models.CharField(max_length=500, null=True, blank=True)

    # Report Content Summary Fields
    total_cases = models.IntegerField(default=0)
    resolved_cases = models.IntegerField(default=0)
    pending_cases = models.IntegerField(default=0)
    rejected_cases = models.IntegerField(default=0)
    closed_cases = models.IntegerField(default=0)
    average_resolution_days = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    minimum_resolution_days = models.IntegerField(null=True, blank=True)
    maximum_resolution_days = models.IntegerField(null=True, blank=True)
    hearings_conducted = models.IntegerField(default=0)
    decisions_written = models.IntegerField(default=0)

    # Financial Metrics
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    judge_service_fees = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    paid_cases = models.IntegerField(default=0)
    unpaid_cases = models.IntegerField(default=0)

    # Performance Metrics
    cases_per_judge = models.JSONField(null=True, blank=True)
    cases_per_registrar = models.JSONField(null=True, blank=True)
    average_case_duration = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    backlog_cases = models.IntegerField(default=0)

    # Case Intelligence Fields
    most_common_case_type = models.CharField(max_length=100, null=True, blank=True)
    most_common_issue = models.CharField(max_length=255, null=True, blank=True)
    top_issues = models.JSONField(null=True, blank=True)

    # Demographic Insights
    education_distribution = models.JSONField(null=True, blank=True)
    gender_distribution = models.JSONField(null=True, blank=True)
    age_group_distribution = models.JSONField(null=True, blank=True)
    occupation_distribution = models.JSONField(null=True, blank=True)

    # Report Metadata Fields
    generation_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    generation_duration_seconds = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    last_downloaded_at = models.DateTimeField(null=True, blank=True)

    # Report Description Fields
    report_description = models.TextField(null=True, blank=True)
    report_summary = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-generated_at']
        verbose_name = 'Report'
        verbose_name_plural = 'Reports'

    def __str__(self):
        return f"{self.report_title} ({self.report_type}) - {self.generated_at.strftime('%Y-%m-%d')}"
