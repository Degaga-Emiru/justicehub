from rest_framework import status, viewsets, decorators
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import ReportService
from .analytics_services import AnalyticsService
from django.http import HttpResponse, FileResponse
from django.utils import timezone
import io
from .utils import ExportGenerator
from .permissions import IsJudge, IsAdminUserRole
from .models import Report
from .serializers import ReportModelSerializer

class ReportBaseView(APIView):
    permission_classes = [IsAuthenticated]

class JudgeReportView(ReportBaseView):
    permission_classes = [IsJudge]
    def get(self, request):
        category = request.query_params.get('category', 'performance') # performance or financial
        days = request.query_params.get('days')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if category == 'financial':
            data = ReportService.get_financial_report(judge=request.user, days=days, start_date=start_date, end_date=end_date)
        else:
            data = ReportService.get_judge_report(request.user, days=days, start_date=start_date, end_date=end_date)
        return Response(data)

class AdminJudgeReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request, judge_id):
        try:
            from accounts.models import User as AccountUser
            judge = AccountUser.objects.get(id=judge_id, role='JUDGE')
        except (AccountUser.DoesNotExist, ValueError):
            return Response({"detail": "Judge not found"}, status=status.HTTP_404_NOT_FOUND)
            
        days = request.query_params.get('days')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        data = ReportService.get_judge_report(judge, days=days, start_date=start_date, end_date=end_date)
        return Response(data)

class SystemReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        report_type = request.query_params.get('type', 'overview')
        days = request.query_params.get('days')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if report_type == 'overview':
            data = ReportService.get_system_overview(days=days, start_date=start_date, end_date=end_date)
            # Inject analytics into overview for comprehensive data
            data['demographics'] = AnalyticsService.get_demographics()
            data['intelligence_insights'] = AnalyticsService.get_intelligence_insights()
        elif report_type in ['daily', 'weekly', 'monthly', 'yearly']:
            data = ReportService.get_time_report(type=report_type.upper())
        elif report_type == 'financial':
            data = ReportService.get_financial_report(days=days)
        elif report_type == 'status':
            by_judge = request.query_params.get('by_judge') == 'true'
            data = ReportService.get_status_report(by_judge=by_judge)
        else:
            return Response({"detail": "Invalid report type"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data)

class AnalyticsReportView(ReportBaseView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        analytics_type = request.query_params.get('type', 'master')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if analytics_type == 'case-type':
            data = AnalyticsService.get_case_type_analysis(start_date, end_date)
        elif analytics_type == 'disputes':
            data = AnalyticsService.get_dispute_analysis(start_date, end_date)
        elif analytics_type == 'problem':
            data = AnalyticsService.get_court_problems(start_date, end_date)
        elif analytics_type == 'resolution':
            data = AnalyticsService.get_resolution_time_metrics(start_date, end_date)
        elif analytics_type == 'demographic':
            data = AnalyticsService.get_demographics(start_date, end_date)
        elif analytics_type == 'intelligence':
            data = AnalyticsService.get_intelligence_insights(start_date, end_date)
        else:
            data = AnalyticsService.get_master_analytics(start_date, end_date)
        return Response(data)

class ExportReportView(ReportBaseView):
    def get(self, request, export_format=None):
        export_format = export_format or request.query_params.get('format', 'pdf')
        report_scope = request.query_params.get('type', 'system') # system, judge, analytics
        days = request.query_params.get('days')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Admin check for system reports
        if report_scope != 'judge' and (not hasattr(request.user, 'role') or request.user.role != 'ADMIN'):
             return Response({"detail": "Only Admins can export system-wide reports."}, status=status.HTTP_403_FORBIDDEN)

        if report_scope == 'judge':
            data = ReportService.get_judge_report(request.user, days=days, start_date=start_date, end_date=end_date)
            title = "Judge Performance & Revenue Report"
            report_name = "judge"
        elif report_scope == 'analytics':
            data = AnalyticsService.get_master_analytics(start_date=start_date, end_date=end_date)
            title = "Advanced Case Intelligence Report"
            report_name = "analytics"
        else:
            data = ReportService.get_system_overview(days=days, start_date=start_date, end_date=end_date)
            data['demographics'] = AnalyticsService.get_demographics()
            data['intelligence_insights'] = AnalyticsService.get_intelligence_insights()
            title = "General System Judicial Report"
            report_name = "system"

        if export_format == 'csv':
            content = ExportGenerator.to_csv(data, f"{report_name}_report.csv")
        elif export_format == 'excel':
            content = ExportGenerator.to_excel(data, title)
        else: # pdf
            content = ExportGenerator.to_pdf(data, title, report_type=report_name.capitalize())

        # Dynamic extension and content-type detection
        filename = f"justicehub_{report_name}_report.{export_format}"
        if content.startswith(b'%PDF'):
            content_type = 'application/pdf'
            if not filename.endswith('.pdf'): filename += '.pdf'
        elif content.startswith(b'PK\x03\x04'):
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            if not filename.endswith('.xlsx'): filename += '.xlsx'
        elif content.startswith(b'\xef\xbb\xbf') or export_format == 'csv':
            content_type = 'text/csv'
            if not filename.endswith('.csv'): filename += '.csv'
        else:
            content_type = 'application/octet-stream'

        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # Log Report Generation
        from audit_logs.services import create_audit_log
        from audit_logs.models import AuditLog
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.REPORT_GENERATED,
            description=f"Generated {export_format.upper()} report for {report_scope} scope.",
            entity_name=filename
        )

        return response

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

        # Log Report Download
        from audit_logs.services import create_audit_log
        from audit_logs.models import AuditLog
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.DOCUMENT_DOWNLOADED,
            obj=report,
            description=f"Downloaded report: {report.title}",
            entity_name=report.title
        )

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
