from django.db.models import Count, Avg, F, ExpressionWrapper, fields, Max, Min, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from .db_models import Case, User, CaseCategory, JudgeAssignment
from .services import ReportService

class AnalyticsService:
    @classmethod
    def _get_filtered_cases(cls, start_date=None, end_date=None):
        start, end = ReportService.get_date_range(None, start_date, end_date)
        active_cases = ReportService.get_active_cases()
        if start and end:
            active_cases = active_cases.filter(created_at__range=(start, end))
        return active_cases, start, end

    @classmethod
    def get_case_type_analysis(cls, start_date=None, end_date=None):
        active_cases, start, end = cls._get_filtered_cases(start_date, end_date)
        total_cases = active_cases.count()
        analysis = active_cases.values('category__name').annotate(
            total=Count('id')
        ).order_by('-total')
        
        results = []
        for item in analysis:
            percentage = (item['total'] / total_cases * 100) if total_cases > 0 else 0
            results.append({
                "case_type": item['category__name'],
                "total": item['total'],
                "percentage": f"{percentage:.1f}%"
            })
        
        most_frequent = results[0]['case_type'] if results else "N/A"
        least_frequent = results[-1]['case_type'] if results else "N/A"
        
        return {
            "distribution": results,
            "most_frequent": most_frequent,
            "least_frequent": least_frequent
        }

    @classmethod
    def get_dispute_analysis(cls, start_date=None, end_date=None):
        active_cases, start, end = cls._get_filtered_cases(start_date, end_date)
        analysis = active_cases.values('category__name').annotate(
            total=Count('id')
        ).order_by('-total')
        
        total_with_issue = sum(item['total'] for item in analysis)
        
        results = []
        for item in analysis:
            percentage = (item['total'] / total_with_issue * 100) if total_with_issue > 0 else 0
            results.append({
                "issue": item['category__name'],
                "count": item['total'],
                "percentage": f"{percentage:.1f}%"
            })
            
        return {
            "most_common_disputes": results[:10], # Top 10
            "issue_ranking": [r['issue'] for r in results[:10]]
        }

    @classmethod
    def get_court_problems(cls, start_date=None, end_date=None):
        active_cases, start, end = cls._get_filtered_cases(start_date, end_date)
        # 1. Most common issue (Fallback to category)
        most_common = active_cases.values('category__name').annotate(count=Count('id')).order_by('-count').first()
        
        # 2. Longest pending cases (not resolved)
        backlog_count = active_cases.exclude(status='CLOSED').count()
        
        # 3. Longest resolution time
        # We need a duration calculation
        resolved_cases = active_cases.filter(status='CLOSED', closed_date__isnull=False)
        duration_expr = ExpressionWrapper(F('closed_date') - F('created_at'), output_field=fields.DurationField())
        avg_res = resolved_cases.annotate(duration=duration_expr).aggregate(avg_days=Avg('duration'))
        
        avg_days = avg_res['avg_days'].days if avg_res['avg_days'] else 0
        
        return {
            "problem_indicators": [
                {"problem": "Most common issue", "measurement": most_common['category__name'] if most_common else "N/A"},
                {"problem": "Longest pending cases", "measurement": f"{backlog_count} cases"},
                {"problem": "Longest resolution", "measurement": f"{avg_days} days (average)"}
            ]
        }

    @classmethod
    def get_resolution_time_metrics(cls, start_date=None, end_date=None):
        active_cases, start, end = cls._get_filtered_cases(start_date, end_date)
        resolved_cases = active_cases.filter(status='CLOSED', closed_date__isnull=False)
        if not resolved_cases.exists():
            return {"average": 0, "fastest": 0, "slowest": 0}
            
        duration_expr = ExpressionWrapper(F('closed_date') - F('created_at'), output_field=fields.DurationField())
        metrics = resolved_cases.annotate(duration=duration_expr).aggregate(
            avg=Avg('duration'),
            min=Min('duration'),
            max=Max('duration')
        )
        
        return {
            "average": metrics['avg'].days if metrics['avg'] else 0,
            "fastest": metrics['min'].days if metrics['min'] else 0,
            "slowest": metrics['max'].days if metrics['max'] else 0,
            "min_days": metrics['min'].days if metrics['min'] else 0,
            "max_days": metrics['max'].days if metrics['max'] else 0
        }

    @classmethod
    def get_demographics(cls, start_date=None, end_date=None):
        active_cases, start, end = cls._get_filtered_cases(start_date, end_date)
        total_cases = active_cases.count()
        
        # We use plaintiff demographics. If plaintiff is null, fallback to created_by
        from django.db.models.functions import Coalesce
        
        active_cases = active_cases.annotate(
            demo_edu=Coalesce('plaintiff__education_level', 'created_by__education_level'),
            demo_sex=Coalesce('plaintiff__sex', 'created_by__sex'),
            demo_age=Coalesce('plaintiff__age', 'created_by__age'),
            demo_occ=Coalesce('plaintiff__occupation', 'created_by__occupation'),
            demo_subcity=Coalesce('plaintiff__address_subcity', 'created_by__address_subcity')
        )
        
        # Education
        edu = active_cases.values('demo_edu').annotate(count=Count('id'))
        # Sex
        sex = active_cases.values('demo_sex').annotate(count=Count('id'))
        # Age
        age_groups = {
            "18-25": active_cases.filter(demo_age__gte=18, demo_age__lte=25).count(),
            "26-40": active_cases.filter(demo_age__gte=26, demo_age__lte=40).count(),
            "41-60": active_cases.filter(demo_age__gte=41, demo_age__lte=60).count(),
            "60+": active_cases.filter(demo_age__gt=60).count(),
        }
        # Occupation
        occ = active_cases.values('demo_occ').annotate(count=Count('id'))
        # Address Subcity
        subcity = active_cases.values('demo_subcity').annotate(count=Count('id'))
        
        return {
            "education_distribution": {item['demo_edu'] or "Not Specified": item['count'] for item in edu},
            "sex_distribution": {
                f"{item['demo_sex'] or 'Not Specified'}": f"{(item['count']/total_cases*100):.1f}%" if total_cases > 0 else "0%"
                for item in sex
            },
            "age_distribution": age_groups,
            "occupation_distribution": {item['demo_occ'] or "Not Specified": item['count'] for item in occ},
            "subcity_distribution": {item['demo_subcity'] or "Not Specified": item['count'] for item in subcity}
        }

    @classmethod
    def get_decision_type_analysis(cls, start_date=None, end_date=None):
        """Requirement 5: Mediation and Immediate Decisions."""
        from .db_models import Decision
        start, end = ReportService.get_date_range(None, start_date, end_date)
        all_decisions = Decision.objects.all()
        if start and end:
            all_decisions = all_decisions.filter(created_at__range=(start, end))
        total = all_decisions.count()
        
        # Track mediation (IMMEDIATE + MEDIATED or SETTLEMENT)
        mediation_count = all_decisions.filter(
            Q(decision_type='SETTLEMENT') | 
            Q(decision_type='IMMEDIATE', immediate_reason='MEDIATED')
        ).count()
        
        immediate_count = all_decisions.filter(decision_type='IMMEDIATE').count()
        
        distribution = all_decisions.values('decision_type').annotate(count=Count('id'))
        
        return {
            "total_decisions": total,
            "mediation_resolved": mediation_count,
            "immediate_decisions": immediate_count,
            "distribution": {item['decision_type']: item['count'] for item in distribution}
        }

    @classmethod
    def get_intelligence_insights(cls, start_date=None, end_date=None):
        active_cases, start, end = cls._get_filtered_cases(start_date, end_date)
        
        # Calculate system backlog (all non-closed active cases)
        system_backlog = active_cases.exclude(status='CLOSED').count()
        
        # Overloaded judges (e.g. assigned to > 5 active cases)
        overloaded_judges = JudgeAssignment.objects.filter(
            is_active=True, 
            case__is_deleted=False, 
            case__status__in=['PENDING', 'IN_PROGRESS', 'HEARING_SCHEDULED']
        ).values('judge').annotate(case_count=Count('id')).filter(case_count__gt=5).count()
        
        # Pending registrations
        pending_registrations = User.objects.filter(is_active=False).count()
        
        warnings = []
        if system_backlog > 50:
            warnings.append(f"High system backlog detected ({system_backlog} pending cases).")
        if overloaded_judges > 0:
            warnings.append(f"{overloaded_judges} judges are currently overloaded (handling >5 active cases).")
        if pending_registrations > 10:
            warnings.append(f"There are {pending_registrations} user registrations waiting for approval.")
        
        bottlenecks = []
        backlog_category = active_cases.exclude(status='CLOSED').values('category__name').annotate(count=Count('id')).order_by('-count').first()
        if backlog_category:
            bottlenecks.append(f"Most pending cases are in: {backlog_category['category__name']} ({backlog_category['count']} cases)")
        
        least_category = active_cases.values('category__name').annotate(count=Count('id')).order_by('count').first()
        if least_category:
            bottlenecks.append(f"Least reported case type: {least_category['category__name']}")
            
        # Demographic bottlenecks
        top_subcity = User.objects.values('address_subcity').annotate(count=Count('id')).exclude(address_subcity__isnull=True).exclude(address_subcity="").order_by('-count').first()
        if top_subcity:
            bottlenecks.append(f"Regional Hotspot: Most users are registered in {top_subcity['address_subcity']} sub-city.")
        
        return {
            "warnings": warnings,
            "bottlenecks": bottlenecks,
            "overloaded_judges": overloaded_judges,
            "system_backlog": system_backlog,
            "pending_registrations": pending_registrations
        }

    @classmethod
    def get_payment_analytics(cls, start_date=None, end_date=None):
        from payments.models import Payment
        from django.db.models import Sum
        from django.db.models.functions import TruncMonth
        
        start, end = ReportService.get_date_range(None, start_date, end_date)
        # Only count successful or verified payments
        payments = Payment.objects.filter(status__in=['SUCCESS', 'VERIFIED'])
        
        if start and end:
            payments = payments.filter(paid_at__range=(start, end))
        
        total_revenue = payments.aggregate(total=Sum('amount'))['total'] or 0
        
        # Monthly revenue trend
        monthly_revenue = payments.annotate(
            month=TruncMonth('paid_at')
        ).values('month').annotate(total=Sum('amount')).order_by('month')
        
        revenue_trend = []
        for item in monthly_revenue:
            if item['month']:
                revenue_trend.append({
                    "month": item['month'].strftime('%b %Y'),
                    "revenue": float(item['total'])
                })
        
        # Revenue by category distribution
        category_revenue = payments.values('case__category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        category_data = []
        for item in category_revenue:
            category_data.append({
                "name": item['case__category__name'] or "General",
                "value": float(item['total'])
            })
            
        return {
            "total_revenue": float(total_revenue),
            "revenue_trend": revenue_trend,
            "category_revenue": category_data
        }

    @classmethod
    def get_master_analytics(cls, start_date=None, end_date=None):
        return {
            "case_type_analysis": cls.get_case_type_analysis(start_date, end_date),
            "dispute_analysis": cls.get_dispute_analysis(start_date, end_date),
            "court_problems": cls.get_court_problems(start_date, end_date),
            "resolution_time_metrics": cls.get_resolution_time_metrics(start_date, end_date),
            "demographics": cls.get_demographics(start_date, end_date),
            "decision_analysis": cls.get_decision_type_analysis(start_date, end_date),
            "intelligence_insights": cls.get_intelligence_insights(start_date, end_date),
            "volume_by_month": cls.get_volume_by_month(start_date, end_date),
            "case_flow_trends": cls.get_case_flow_trends(start_date, end_date),
            "payment_analytics": cls.get_payment_analytics(start_date, end_date),
            "judge_metrics": cls.get_judge_performance_metrics(),
            "generated_at": timezone.now()
        }

    @classmethod
    def get_volume_by_month(cls, start_date=None, end_date=None):
        start, end = ReportService.get_date_range(None, start_date, end_date)
        if start and end:
            cases = Case.objects.filter(created_at__range=(start, end))
        else:
            six_months_ago = timezone.now() - timedelta(days=180)
            cases = Case.objects.filter(created_at__gte=six_months_ago)
            
        volume = cases.annotate(month=TruncMonth('created_at')).values('month').annotate(count=Count('id')).order_by('month')
        
        result = {}
        for item in volume:
            if item['month']:
                month_str = item['month'].strftime('%b')
                result[month_str] = item['count']
        return result

    @classmethod
    def get_case_flow_trends(cls, start_date=None, end_date=None):
        """Calculates daily case creation vs closing trends."""
        start, end = ReportService.get_date_range(None, start_date, end_date)
        if not start:
            start = timezone.now() - timedelta(days=30)
        if not end:
            end = timezone.now()
            
        cases = Case.objects.filter(created_at__range=(start, end))
        
        # Group by day
        from django.db.models.functions import TruncDay
        created_trends = cases.annotate(day=TruncDay('created_at')).values('day').annotate(count=Count('id')).order_by('day')
        closed_trends = Case.objects.filter(status='CLOSED', closed_date__range=(start, end)).annotate(day=TruncDay('closed_date')).values('day').annotate(count=Count('id')).order_by('day')
        
        # Merge results
        trends = {}
        for item in created_trends:
            d = item['day'].strftime('%Y-%m-%d')
            trends[d] = {"created": item['count'], "closed": 0}
            
        for item in closed_trends:
            d = item['day'].strftime('%Y-%m-%d')
            if d in trends:
                trends[d]["closed"] = item['count']
            else:
                trends[d] = {"created": 0, "closed": item['count']}
                
        # Sort by date
        sorted_trends = [{"date": k, **v} for k, v in sorted(trends.items())]
        return sorted_trends

    @classmethod
    def get_judge_performance_metrics(cls):
        """Compares resolution times and caseloads per judge."""
        judges = User.objects.filter(role='JUDGE', is_active=True)
        results = []
        
        duration_expr = ExpressionWrapper(F('closed_date') - F('created_at'), output_field=fields.DurationField())
        
        for judge in judges:
            # Active cases
            active_count = JudgeAssignment.objects.filter(judge=judge, is_active=True).count()
            
            # Resolved cases metrics
            case_ids = JudgeAssignment.objects.filter(judge=judge).values_list('case_id', flat=True)
            resolved_cases = Case.objects.filter(
                id__in=case_ids,
                status='CLOSED', 
                closed_date__isnull=False
            ).annotate(duration=duration_expr)
            
            avg_res = resolved_cases.aggregate(avg_days=Avg('duration'))
            avg_days = avg_res['avg_days'].days if avg_res['avg_days'] else 0
            
            results.append({
                "id": str(judge.id),
                "name": judge.get_full_name(),
                "active_cases": active_count,
                "avg_resolution_days": avg_days,
                "total_resolved": resolved_cases.count()
            })
            
        return sorted(results, key=lambda x: x['active_cases'], reverse=True)
