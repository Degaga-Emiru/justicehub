from django.db.models import Count, Avg, F, ExpressionWrapper, fields, Max, Min, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from .db_models import Case, User, CaseCategory
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
        start, end = ReportService.get_date_range(None, start_date, end_date)
        users = User.objects.all()
        if start and end:
            users = users.filter(date_joined__range=(start, end))
        total_users = users.count()
        
        # Education
        edu = users.values('education_level').annotate(count=Count('id'))
        # Gender
        gender = users.values('gender').annotate(count=Count('id'))
        # Age
        age_groups = {
            "18-25": users.filter(age__gte=18, age__lte=25).count(),
            "26-40": users.filter(age__gte=26, age__lte=40).count(),
            "41-60": users.filter(age__gte=41, age__lte=60).count(),
            "60+": users.filter(age__gt=60).count(),
        }
        # Occupation
        occ = users.values('occupation').annotate(count=Count('id'))
        
        return {
            "education_distribution": {item['education_level'] or "Not Specified": item['count'] for item in edu},
            "gender_distribution": {
                f"{item['gender'] or 'Other'} %": f"{(item['count']/total_users*100):.1f}%" if total_users > 0 else "0%"
                for item in gender
            },
            "age_distribution": age_groups,
            "occupation_distribution": {item['occupation'] or "Not Specified": item['count'] for item in occ}
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
        from .db_models import JudgeAssignment
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
        
        return {
            "warnings": warnings,
            "bottlenecks": bottlenecks,
            "overloaded_judges": overloaded_judges,
            "system_backlog": system_backlog,
            "pending_registrations": pending_registrations
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
