from rest_framework import serializers

class PeriodSerializer(serializers.Serializer):
    type = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()

# 1. Judge Reports
class CaseTypeRevenueSerializer(serializers.Serializer):
    case_type = serializers.CharField()
    count = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)

class JudgeFinancialSerializer(serializers.Serializer):
    total_service_fees_earned = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_by_case_type = CaseTypeRevenueSerializer(many=True, required=False)
    cases_handled = serializers.IntegerField(required=False)
    average_fee_per_case = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    paid_cases = serializers.IntegerField(required=False)
    unpaid_cases = serializers.IntegerField(required=False)

class JudgeReportSummarySerializer(serializers.Serializer):
    total_cases_assigned = serializers.IntegerField()
    total_resolved_cases = serializers.IntegerField()
    pending_cases = serializers.IntegerField()
    resolution_rate = serializers.CharField()
    hearings_conducted = serializers.IntegerField()
    decisions_finalized = serializers.IntegerField()
    average_resolution_days = serializers.IntegerField()

class ActivitySerializer(serializers.Serializer):
    date = serializers.DateField()
    activity = serializers.CharField()
    type = serializers.CharField()

class JudgeReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    generated_at = serializers.DateTimeField()
    generated_by = serializers.CharField()
    period = PeriodSerializer()
    summary = JudgeReportSummarySerializer()
    financial = JudgeFinancialSerializer()
    cases_by_status = serializers.DictField(child=serializers.IntegerField())
    recent_activities = ActivitySerializer(many=True)
    export_links = serializers.DictField(child=serializers.CharField())

# 2. System Overview
class CaseTypePercentageSerializer(serializers.Serializer):
    case_type = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.CharField()

class JudgePerformanceSerializer(serializers.Serializer):
    judge_name = serializers.CharField()
    assigned = serializers.IntegerField()
    resolved = serializers.IntegerField()
    pending = serializers.IntegerField()
    hearings = serializers.IntegerField(required=False)

class FinancialSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    paid_cases = serializers.IntegerField()
    unpaid_cases = serializers.IntegerField()
    collection_rate = serializers.CharField()
    average_case_fee = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    revenue_by_month = serializers.ListField(child=serializers.DictField(), required=False)
    revenue_by_judge = serializers.ListField(child=serializers.DictField(), required=False)
    revenue_by_case_type = serializers.ListField(child=serializers.DictField(), required=False)
    payment_methods = serializers.DictField(child=serializers.DecimalField(max_digits=15, decimal_places=2), required=False)

class SystemSummarySerializer(serializers.Serializer):
    total_cases = serializers.IntegerField()
    total_resolved = serializers.IntegerField()
    pending_cases = serializers.IntegerField()
    resolution_rate = serializers.CharField()
    average_resolution_days = serializers.IntegerField()
    total_judges = serializers.IntegerField()
    total_lawyers = serializers.IntegerField()
    total_users = serializers.IntegerField()

class SystemOverviewReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    generated_at = serializers.DateTimeField()
    generated_by = serializers.CharField()
    period = PeriodSerializer()
    system_summary = SystemSummarySerializer()
    cases_by_type = CaseTypePercentageSerializer(many=True)
    cases_by_judge = JudgePerformanceSerializer(many=True)
    cases_by_status = serializers.DictField(child=serializers.IntegerField())
    financial_summary = FinancialSummarySerializer()
    export_links = serializers.DictField(child=serializers.CharField())

# 3. Time-Based Reports
class TimeReportSummarySerializer(serializers.Serializer):
    cases_filed = serializers.IntegerField(required=False)
    cases_filed_today = serializers.IntegerField(required=False)
    cases_resolved = serializers.IntegerField(required=False)
    cases_resolved_today = serializers.IntegerField(required=False)
    pending_cases = serializers.IntegerField()
    avg_resolution_days = serializers.IntegerField(required=False)
    hearings_conducted = serializers.IntegerField()
    decisions_issued = serializers.IntegerField()
    revenue_collected = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    revenue_collected_today = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)

class DailyReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    report_type = serializers.CharField()
    date = serializers.DateField()
    generated_at = serializers.DateTimeField()
    summary = TimeReportSummarySerializer()
    top_judges_today = serializers.ListField(child=serializers.DictField())
    recent_activities = ActivitySerializer(many=True)

class WeeklyReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    report_type = serializers.CharField()
    week = serializers.IntegerField()
    year = serializers.IntegerField()
    period = serializers.DictField()
    summary = TimeReportSummarySerializer()
    daily_breakdown = serializers.ListField(child=serializers.DictField())

# 4. Financial Detailed
class SystemFinancialReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    period = PeriodSerializer()
    summary = FinancialSummarySerializer()
    revenue_by_judge = serializers.ListField(child=serializers.DictField())
    revenue_by_case_type = serializers.ListField(child=serializers.DictField())
    revenue_by_month = serializers.ListField(child=serializers.DictField())
    payment_methods = serializers.DictField(child=serializers.DecimalField(max_digits=15, decimal_places=2))

# 5. Status Detailed
class StatusDetailSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    percentage = serializers.CharField()
    details = serializers.ListField(child=serializers.DictField())

class SystemStatusReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    generated_at = serializers.DateTimeField()
    total_cases = serializers.IntegerField()
    status_breakdown = serializers.DictField(child=StatusDetailSerializer())
    status_trends = serializers.DictField(child=serializers.ListField(child=serializers.CharField()))

class JudgeStatusReportSerializer(serializers.Serializer):
    report_id = serializers.CharField()
    judges = serializers.ListField(child=serializers.DictField())

# Phase 2: Analytics Serializers
class AnalyticsCaseTypeSerializer(serializers.Serializer):
    distribution = serializers.ListField(child=serializers.DictField())
    most_frequent = serializers.CharField()

class AnalyticsDisputeSerializer(serializers.Serializer):
    most_common_disputes = serializers.ListField(child=serializers.DictField())
    issue_ranking = serializers.ListField(child=serializers.CharField())

class ResolutionTimeSerializer(serializers.Serializer):
    average = serializers.IntegerField()
    fastest = serializers.IntegerField()
    slowest = serializers.IntegerField()
    min_days = serializers.IntegerField()
    max_days = serializers.IntegerField()

class DemographicsSerializer(serializers.Serializer):
    education_distribution = serializers.DictField(child=serializers.IntegerField())
    gender_distribution = serializers.DictField(child=serializers.CharField())
    age_distribution = serializers.DictField(child=serializers.IntegerField())
    occupation_distribution = serializers.DictField(child=serializers.IntegerField())

class AnalyticsIntelligenceSerializer(serializers.Serializer):
    insights = serializers.ListField(child=serializers.CharField())

class CourtProblemSerializer(serializers.Serializer):
from .models import Report

class ReportModelSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)
    registrar_name = serializers.CharField(source='registrar.get_full_name', read_only=True)

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['id', 'generated_at', 'download_count', 'last_downloaded_at', 'file_size', 'storage_path']
