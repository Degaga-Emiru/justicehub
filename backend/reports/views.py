from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import ReportService
from django.http import HttpResponse
from .utils import ExportGenerator
from .permissions import IsJudge, IsAdminUserRole

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
