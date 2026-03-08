from rest_framework import status, viewsets, decorators
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import ReportService
from .analytics_services import AnalyticsService
from django.http import HttpResponse
from django.utils import timezone
from .utils import ExportGenerator
from .permissions import IsJudge, IsAdminUserRole
from .models import Report
from .serializers import ReportModelSerializer

class ReportBaseView(APIView):
    permission_classes = [IsAuthenticated]

class JudgePersonalReportView(ReportBaseView):
    permission_classes = [IsJudge]
    def get(self, request):
        days = request.query_params.get('days')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        report_data = ReportService.get_judge_report(request.user, days, start_date, end_date)
        return Response(report_data)

class JudgeFinancialReportView(ReportBaseView):
    permission_classes = [IsJudge]
    def get(self, request):
        days = request.query_params.get('days')
        report_data = ReportService.get_financial_report(judge=request.user, days=days)
        return Response(report_data)

class SystemOverviewReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        days = request.query_params.get('days')
        report_data = ReportService.get_system_overview(days=days)
        return Response(report_data)

class SystemDailyReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        date = request.query_params.get('date')
        report_data = ReportService.get_time_report(type='DAILY', date=date)
        return Response(report_data)

class SystemWeeklyReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        week = request.query_params.get('week')
        year = request.query_params.get('year')
        report_data = ReportService.get_time_report(type='WEEKLY', week=week, year=year)
        return Response(report_data)

class SystemMonthlyReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        report_data = ReportService.get_time_report(type='MONTHLY', month=month, year=year)
        return Response(report_data)

class SystemYearlyReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        year = request.query_params.get('year')
        report_data = ReportService.get_time_report(type='YEARLY', year=year)
        return Response(report_data)

class SystemFinancialReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        days = request.query_params.get('days')
        report_data = ReportService.get_financial_report(days=days)
        return Response(report_data)

class SystemStatusReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        report_data = ReportService.get_status_report(by_judge=False)
        return Response(report_data)

class SystemStatusByJudgeReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        report_data = ReportService.get_status_report(by_judge=True)
        return Response(report_data)

class ExportReportView(ReportBaseView):
    def get(self, request):
        report_type = request.query_params.get('report_type', 'system')
        format = request.query_params.get('format', 'json')
        days = request.query_params.get('days')
        
        # Internal permission check
        if report_type in ['system', 'financial', 'status'] and request.user.role != 'ADMIN':
            return Response({"detail": "Only Admins can access system-wide reports."}, status=status.HTTP_403_FORBIDDEN)
        
        # Determine which report to generate based on type
        if report_type == 'judge':
            data = ReportService.get_judge_report(request.user, days=days)
            title = "Judge Personal Performance Report"
        elif report_type == 'financial':
            data = ReportService.get_financial_report(days=days)
            title = "System Financial Report"
        elif report_type == 'status':
            data = ReportService.get_status_report()
            title = "Cases Status Breakdown Report"
        elif report_type == 'analytics':
            data = AnalyticsService.get_master_analytics()
            title = "Advanced Case Intelligence & Analytics Report"
        else:
            data = ReportService.get_system_overview(days=days)
            title = "System Overview Report"

        if format == 'csv':
            content = ExportGenerator.to_csv(data, 'report.csv')
            response = HttpResponse(content, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="justicehub_{report_type}_report.csv"'
            return response
        elif format == 'pdf':
            content = ExportGenerator.to_pdf(data, title)
            response = HttpResponse(content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="justicehub_{report_type}_report.pdf"'
            return response
        
        return Response(data)

# Phase 2: Analytics Views
class AnalyticsCaseTypeView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        data = AnalyticsService.get_case_type_analysis()
        return Response(data)

class AnalyticsDisputeView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        data = AnalyticsService.get_dispute_analysis()
        return Response(data)

class AnalyticsProblemView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        data = AnalyticsService.get_court_problems()
        return Response(data)

class AnalyticsResolutionTimeView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        data = AnalyticsService.get_resolution_time_metrics()
        return Response(data)

class AnalyticsDemographicsView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        data = AnalyticsService.get_demographics()
        return Response(data)

class AnalyticsIntelligenceView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        data = AnalyticsService.get_intelligence_insights()
        return Response(data)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportModelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Role-based filtering
        if hasattr(self.request.user, 'role'):
            if self.request.user.role == 'JUDGE':
                queryset = queryset.filter(judge=self.request.user)
            elif self.request.user.role == 'REGISTRAR':
                queryset = queryset.filter(registrar=self.request.user)
        # ADMIN can see all

        # Parameter-based filtering
        format = self.request.query_params.get('format')
        if format:
            queryset = queryset.filter(file_format=format)
            
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(generated_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(generated_at__date__lte=end_date)
            
        return queryset

    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        report = self.get_object()
        if not report.file:
            return Response({"detail": "No file associated with this report."}, status=status.HTTP_404_NOT_FOUND)
        
        # Increment download count
        report.download_count += 1
        report.last_downloaded_at = timezone.now()
        report.save()
        
        # Determine content type
        content_type = 'application/octet-stream'
        if report.file_format == 'pdf':
            content_type = 'application/pdf'
        elif report.file_format == 'csv':
            content_type = 'text/csv'
        elif report.file_format == 'json':
            content_type = 'application/json'
            
        response = HttpResponse(report.file.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{report.file.name.split("/")[-1]}"'
        return response

    @decorators.action(detail=False, methods=['get'], url_path='download')
    def download_filtered(self, request):
        """
        Endpoint for GET /reports/download/?format=pdf or date ranges
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @decorators.action(detail=False, methods=['get'], url_path='download-all')
    def download_all(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
