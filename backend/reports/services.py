from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from .db_models import Case, Payment, Hearing, Decision, JudgeAssignment, HearingParticipant
import uuid

User = get_user_model()

class ReportService:
    @staticmethod
    def get_date_range(days=None, start_date=None, end_date=None):
        if start_date and end_date:
            return start_date, end_date
        
        end_date = timezone.now()
        if days:
            try:
                start_date = end_date - timedelta(days=int(days))
            except (ValueError, TypeError):
                start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=30)
        return start_date, end_date

    @staticmethod
    def get_active_cases():
        """Returns only 'Actual' non-deleted, non-test cases."""
        # Using unmanaged models from .db_models
        return Case.objects.filter(is_deleted=False, category__is_active=True).exclude(
            Q(category__name__icontains='test') | 
            Q(category__name__icontains='debug') |
            Q(category__name__icontains='visibility')
        )

    @staticmethod
    def calculate_avg_resolution_time(queryset):
        resolved = queryset.filter(closed_date__isnull=False, created_at__isnull=False)
        if not resolved.exists():
            return "0d"
        from django.db.models import ExpressionWrapper, fields
        duration_expr = ExpressionWrapper(F('closed_date') - F('created_at'), output_field=fields.DurationField())
        avg_res = resolved.annotate(duration=duration_expr).aggregate(avg_duration=Avg('duration'))
        
        td = avg_res['avg_duration']
        if not td:
            return "0d"
            
        days = td.days
        hours = td.seconds // 3600
        minutes = (td.seconds % 3600) // 60
        
        if days > 0:
            return f"{days}d {hours}h"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"

    @staticmethod
    def get_status_counts(queryset):
        """Helper to get standardized status counts for Requirement 4."""
        total = queryset.count()
        return {
            "total_cases": total,
            "resolved": queryset.filter(status='CLOSED').count(),
            "approved": queryset.filter(status='APPROVED').count(),
            "assigned": queryset.filter(id__in=JudgeAssignment.objects.filter(is_active=True).values_list('case_id', flat=True)).count(),
            "rejected": queryset.filter(status='REJECTED').count(),
            "pending_review": queryset.filter(status='PENDING_REVIEW').count(),
            "decided": queryset.filter(status='DECIDED').count() or Decision.objects.filter(case_id__in=queryset.values_list('id', flat=True)).count(),
            "in_progress": queryset.filter(status='IN_PROGRESS').count()
        }

    @staticmethod
    def get_hearing_stats(queryset, start=None, end=None):
        """Helper for Requirement 9."""
        hearings = Hearing.objects.filter(case_id__in=queryset.values_list('id', flat=True))
        if start and end:
            hearings = hearings.filter(scheduled_date__range=(start, end))
            
        total = hearings.count()
        stats = {
            "total_hearings": total,
            "conducted": hearings.filter(status='CONDUCTED').count() + hearings.filter(status='COMPLETED').count(),
            "postponed": hearings.filter(status='POSTPONED').count(),
            "cancelled": hearings.filter(status='CANCELLED').count(),
            "attended": HearingParticipant.objects.filter(hearing_id__in=hearings, attendance_status='PRESENT').values('hearing_id').distinct().count(),
            "not_attended": HearingParticipant.objects.filter(hearing_id__in=hearings, attendance_status='ABSENT').values('hearing_id').distinct().count()
        }
        # Backlog contribution: Postponed or Absent
        stats["backlog_contribution"] = stats["postponed"] + stats["not_attended"]
        return stats

    @classmethod
    def get_judge_report(cls, judge, days=None, start_date=None, end_date=None):
        start, end = cls.get_date_range(days, start_date, end_date)
        assignments = JudgeAssignment.objects.filter(judge=judge, is_active=True)
        case_ids = assignments.values_list('case_id', flat=True)
        cases = cls.get_active_cases().filter(id__in=case_ids)
        
        total_assigned = cases.count()
        resolved_qs = cases.filter(status='CLOSED', closed_date__range=(start, end))
        resolved = resolved_qs.count()
        pending = cases.exclude(status='CLOSED').count()
        res_rate = f"{(resolved / total_assigned * 100):.1f}%" if total_assigned > 0 else "0%"
        hearings = Hearing.objects.filter(judge=judge, status='COMPLETED', scheduled_date__range=(start, end)).count()
        decisions = Decision.objects.filter(judge=judge, status='FINALIZED', finalized_at__range=(start, end)).count()
        
        total_fees = Payment.objects.filter(case_id__in=case_ids, status='SUCCESSFUL').aggregate(total=Sum('amount'))['total'] or 0
        status_stats = cls.get_status_counts(cases)
        hearing_stats = cls.get_hearing_stats(cases, start, end)
        
        # Financial: SUCCESS or VERIFIED
        revenue_qs = Payment.objects.filter(case_id__in=case_ids, status__in=['SUCCESS', 'VERIFIED'])
        total_fees = revenue_qs.aggregate(total=Sum('amount'))['total'] or 0
        
        # Revenue by case type for this judge
        revenue_by_type = revenue_qs.values('case__category__name')\
            .annotate(count=Count('id'), revenue=Sum('amount'))
            
        return {
            "report_id": f"rep_judge_{timezone.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:3].upper()}",
            "generated_at": timezone.now(),
            "generated_by": f"{judge.get_full_name()}",
            "period": {"type": "Custom", "start_date": start, "end_date": end},
            "summary": {
                "total_cases_assigned": status_stats["total_cases"],
                "total_resolved_cases": status_stats["resolved"],
                "pending_cases": status_stats["total_cases"] - status_stats["resolved"],
                "resolution_rate": f"{(status_stats['resolved'] / status_stats['total_cases'] * 100):.1f}%" if status_stats['total_cases'] > 0 else "0%",
                "hearings": hearing_stats,
                "decisions_finalized": status_stats["decided"],
                "average_resolution_time": cls.calculate_avg_resolution_time(resolved_qs)
            },
            "financial": {
                "total_service_fees_earned": total_fees,
                "revenue_by_case_type": [
                    {"case_type": item['case__category__name'], "count": item['count'], "revenue": item['revenue']}
                    for item in revenue_by_type
                ]
            },
            "cases_by_status": status_stats,
            "export_links": {
                "csv": f"/api/reports/admin/export/csv/?report_type=judge&days={days or 30}",
                "pdf": f"/api/reports/admin/export/pdf/?report_type=judge&days={days or 30}",
                "excel": f"/api/reports/admin/export/excel/?report_type=judge&days={days or 30}"
            }
        }

    @classmethod
    def get_system_overview(cls, days=None, start_date=None, end_date=None):
        start, end = cls.get_date_range(days, start_date, end_date)
        active_cases = cls.get_active_cases()
        total_cases = active_cases.count()
        resolved_qs = active_cases.filter(status='CLOSED')
        total_resolved = resolved_qs.count()
        pending = active_cases.exclude(status='CLOSED').count()
        res_rate = f"{(total_resolved / total_cases * 100):.1f}%" if total_cases > 0 else "0%"
        
        status_stats = cls.get_status_counts(active_cases)
        hearing_stats = cls.get_hearing_stats(active_cases, start, end)
        
        # Financial: SUCCESS or VERIFIED
        revenue_qs = Payment.objects.filter(status__in=['SUCCESS', 'VERIFIED'])
        total_revenue = revenue_qs.filter(created_at__range=(start, end)).aggregate(total=Sum('amount'))['total'] or 0
        
        # Cases by type
        cases_by_type = active_cases.filter(created_at__range=(start, end))\
            .values('category__name')\
            .annotate(count=Count('id'))
        
        # Revenue by month
        revenue_by_month = revenue_qs.values('created_at__month')\
            .annotate(revenue=Sum('amount'))\
            .order_by('created_at__month')

        return {
            "report_id": f"rep_system_{timezone.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:3].upper()}",
            "generated_at": timezone.now(),
            "generated_by": "Admin User",
            "period": {"type": f"last_{days or 90}_days", "start_date": start, "end_date": end},
            "system_summary": {
                "stats": status_stats,
                "hearings": hearing_stats,
                "resolution_rate": f"{(status_stats['resolved'] / status_stats['total_cases'] * 100):.1f}%" if status_stats['total_cases'] > 0 else "0%",
                "average_resolution_time": cls.calculate_avg_resolution_time(resolved_qs),
                "total_judges": User.objects.filter(role='JUDGE').count(),
                "total_lawyers": User.objects.filter(role='LAWYER').count()
            },
            "cases_by_type": [
                {"case_type": item['category__name'], "count": item['count'], 
                 "percentage": f"{(item['count'] / status_stats['total_cases'] * 100):.1f}%" if status_stats['total_cases'] > 0 else "0%"}
                for item in cases_by_type
            ],
            "financial_summary": {
                "total_revenue": total_revenue,
                "paid_cases": status_stats["approved"], # Assuming approved usually means paid in some flows, but better to use payment_status
                "actual_paid_cases": active_cases.filter(payment_status='PAID').count(),
                "collection_rate": f"{(active_cases.filter(payment_status='PAID').count() / status_stats['total_cases'] * 100):.1f}%" if status_stats['total_cases'] > 0 else "0%",
                "revenue_by_month": [{"month": f"{timezone.now().year}-{item['created_at__month']:02d}", "revenue": item['revenue']} for item in revenue_by_month]
            },
            "export_links": {
                "csv": f"/api/reports/admin/export/csv/?report_type=system&days={days or 90}",
                "pdf": f"/api/reports/admin/export/pdf/?report_type=system&days={days or 90}",
                "excel": f"/api/reports/admin/export/excel/?report_type=system&days={days or 90}"
            }
        }

    @classmethod
    def get_time_report(cls, type='DAILY', date=None, week=None, month=None, year=None):
        now = timezone.now()
        start = now
        end = now
        
        if type == 'DAILY':
            day = date or now.date()
            if isinstance(day, str):
                day = timezone.datetime.strptime(day, '%Y-%m-%d').date()
            start = timezone.make_aware(timezone.datetime.combine(day, timezone.datetime.min.time()))
            end = start + timedelta(days=1)
        elif type == 'WEEKLY':
            start = now - timedelta(days=now.weekday())
            end = start + timedelta(days=7)
        elif type == 'MONTHLY':
            start = now.replace(day=1)
            end = (start + timedelta(days=32)).replace(day=1)
        elif type == 'YEARLY':
            start = now.replace(month=1, day=1)
            end = start.replace(year=start.year + 1)
        
        active_cases = cls.get_active_cases()
        resolved_qs = active_cases.filter(status='CLOSED', closed_date__range=(start, end))
        summary = {
            "cases_filed": active_cases.filter(created_at__range=(start, end)).count(),
            "cases_resolved": resolved_qs.count(),
            "pending_cases": active_cases.exclude(status='CLOSED').count(),
            "avg_resolution_days": cls.calculate_avg_resolution_days(resolved_qs),
            "hearings_conducted": Hearing.objects.filter(status='COMPLETED', scheduled_date__range=(start, end)).count(),
            "decisions_issued": Decision.objects.filter(status='FINALIZED', finalized_at__range=(start, end)).count(),
            "revenue_collected": Payment.objects.filter(status='SUCCESSFUL', created_at__range=(start, end)).aggregate(total=Sum('amount'))['total'] or 0
        }
        
        report = {
            "report_id": f"rep_{type.lower()}_{now.strftime('%Y%m%d')}",
            "report_type": type,
            "generated_at": now,
            "summary": summary
        }
        if type == 'DAILY': report["date"] = start.date()
        if type == 'WEEKLY': report["week"] = week or now.isocalendar()[1]
        if type == 'MONTHLY': report["month"] = month or now.month
        if type == 'YEARLY': report["year"] = year or now.year
        
        return report

    @classmethod
    def get_financial_report(cls, judge=None, days=None, start_date=None, end_date=None):
        start, end = cls.get_date_range(days, start_date, end_date)
        payments_base = Payment.objects.all()
        payments = payments_base.filter(created_at__range=(start, end), status='SUCCESSFUL')
        if judge:
            case_ids = JudgeAssignment.objects.filter(judge=judge, is_active=True).values_list('case_id', flat=True)
            payments = payments.filter(case_id__in=case_ids)
            payments_base = payments_base.filter(case_id__in=case_ids)
        
        total_rev = payments.aggregate(total=Sum('amount'))['total'] or 0
        paid_count = payments.count()
        total_count = payments_base.count()
        
        return {
            "report_id": f"rep_financial_{timezone.now().strftime('%Y%m%d')}",
            "period": {"type": "Custom", "start_date": start, "end_date": end},
            "summary": {
                "total_revenue": total_rev,
                "paid_cases": paid_count,
                "unpaid_cases": total_count - paid_count,
                "collection_rate": f"{(paid_count / total_count * 100):.1f}%" if total_count > 0 else "0%",
                "average_case_fee": float(total_rev / paid_count) if paid_count > 0 else 0
            },
            "revenue_by_judge": [],
            "revenue_by_case_type": [],
            "revenue_by_month": [],
            "payment_methods": {}
        }

    @classmethod
    def get_status_report(cls, by_judge=False):
        if not by_judge:
            total_cases = Case.objects.count()
            status_counts = Case.objects.values('status').annotate(count=Count('id'))
            breakdown = {}
            for item in status_counts:
                st = item['status']
                count = item['count']
                perc = f"{(count / total_cases * 100):.1f}%" if total_cases > 0 else "0%"
                breakdown[st] = {
                    "count": count,
                    "percentage": perc,
                    "details": []
                }
            return {
                "report_id": f"rep_status_{timezone.now().strftime('%Y%m%d')}",
                "generated_at": timezone.now(),
                "total_cases": total_cases,
                "status_breakdown": breakdown,
                "status_trends": {
                    "increased": ["PENDING_REVIEW", "ASSIGNED"],
                    "decreased": ["IN_PROGRESS"],
                    "stable": ["DECIDED", "CLOSED"]
                }
            }
        else:
            judges = User.objects.filter(role='JUDGE')
            report_judges = []
            for judge in judges:
                case_ids = JudgeAssignment.objects.filter(judge=judge, is_active=True).values_list('case_id', flat=True)
                counts = Case.objects.filter(id__in=case_ids).values('status').annotate(count=Count('id'))
                report_judges.append({
                    "judge_id": judge.id,
                    "judge_name": f"{judge.get_full_name()}",
                    "total_cases": len(case_ids),
                    "status_breakdown": {item['status']: item['count'] for item in counts}
                })
            return {
                "report_id": f"rep_status_by_judge_{timezone.now().strftime('%Y%m%d')}",
                "judges": report_judges
            }
