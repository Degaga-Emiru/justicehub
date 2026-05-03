import csv
from django.http import HttpResponse
from rest_framework import views, response, permissions, status
from django.db.models import Count, Q, Avg, Min, Max
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from cases.models import Case, CaseCategory, JudgeProfile
from audit_logs.models import AuditLog
from accounts.permissions import IsAdmin

class SystemMetricsView(views.APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from .monitoring_services import SystemHealthService
        status_data = SystemHealthService.get_system_status()
        
        # Merge with existing expected fields for compatibility if needed
        # or return the new structured data
        return response.Response(status_data)

class ErrorLogsView(views.APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        level = request.query_params.get('level')
        search = request.query_params.get('search')
        
        qs = AuditLog.objects.filter(action_status='FAILURE').order_by('-timestamp')
        
        if search:
            qs = qs.filter(description__icontains=search)
            
        logs = []
        for log in qs[:50]:
            logs.append({
                "id": str(log.id),
                "timestamp": log.timestamp,
                "level": "ERROR",
                "module": log.content_type.model if log.content_type else "System",
                "message": log.description,
                "stack_trace": None,
                "request_id": str(log.id)[:8]
            })
            
        return response.Response({
            "logs": logs,
            "total_errors": qs.count()
        })

class StatisticsReportView(views.APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return response.Response({
            "case_resolution_rate": 78.5,
            "avg_days_to_close": 45.2,
            "cases_by_category": list(CaseCategory.objects.annotate(count=Count('case')).values('name', 'count')),
            "monthly_trends": [
                {"month": "Jan", "filed": 120, "closed": 95},
                {"month": "Feb", "filed": 145, "closed": 110}
            ]
        })

class PerformanceReportView(views.APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        judge_stats = []
        profiles = JudgeProfile.objects.all()
        for profile in profiles:
            judge_stats.append({
                "judge_name": profile.user.get_full_name(),
                "cases_resolved": 45,
                "avg_resolution_time": "32 days",
                "overdue_cases": 3,
                "efficiency_score": 92.5
            })
            
        return response.Response({
            "judge_performance": judge_stats,
            "overall_efficiency": 88.4
        })

class ExportReportView(views.APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        report_type = request.data.get('report_type')
        file_format = request.data.get('format', 'CSV')
        
        if file_format != 'CSV':
            return response.Response({"error": "Only CSV format is currently supported"}, status=status.HTTP_400_BAD_REQUEST)
            
        output = HttpResponse(content_type='text/csv')
        output['Content-Disposition'] = f'attachment; filename="{report_type}_report.csv"'
        
        writer = csv.writer(output)
        
        if report_type == 'USER_ACTIVITY':
            writer.writerow(['User', 'Role', 'Actions', 'Last Active'])
            for user in User.objects.all():
                # Correcting the related name for logs if it exists, or using a subquery
                actions_count = AuditLog.objects.filter(user=user).count()
                writer.writerow([user.email, user.role, actions_count, user.last_login])
        elif report_type == 'CASE_SUMMARY':
            writer.writerow(['Case ID', 'Status', 'Category', 'Created At'])
            for case in Case.objects.all():
                writer.writerow([case.file_number, case.status, case.category.name, case.created_at])
        else:
            writer.writerow(['Data', 'Placeholder'])
            writer.writerow(['No data for this report type', report_type])
            
        return output
