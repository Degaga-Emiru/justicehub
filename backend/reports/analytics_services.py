from django.db.models import Count, Avg, F, ExpressionWrapper, fields, Max, Min
from django.utils import timezone
from datetime import timedelta
from .db_models import Case, User, CaseCategory
from .services import ReportService

class AnalyticsService:
    @staticmethod
    def get_case_type_analysis():
        active_cases = ReportService.get_active_cases()
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

    @staticmethod
    def get_dispute_analysis():
        active_cases = ReportService.get_active_cases()
        analysis = active_cases.exclude(main_issue__isnull=True).values('main_issue').annotate(
            total=Count('id')
        ).order_by('-total')
        
        total_with_issue = sum(item['total'] for item in analysis)
        
        results = []
        for item in analysis:
            percentage = (item['total'] / total_with_issue * 100) if total_with_issue > 0 else 0
            results.append({
                "issue": item['main_issue'],
                "count": item['total'],
                "percentage": f"{percentage:.1f}%"
            })
            
        return {
            "most_common_disputes": results[:10], # Top 10
            "issue_ranking": [r['issue'] for r in results[:10]]
        }

    @staticmethod
    def get_court_problems():
        active_cases = ReportService.get_active_cases()
        # 1. Most common issue
        most_common = active_cases.values('main_issue').annotate(count=Count('id')).order_by('-count').first()
        
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
                {"problem": "Most common issue", "measurement": most_common['main_issue'] if most_common else "N/A"},
                {"problem": "Longest pending cases", "measurement": f"{backlog_count} cases"},
                {"problem": "Longest resolution", "measurement": f"{avg_days} days (average)"}
            ]
        }

    @staticmethod
    def get_resolution_time_metrics():
        active_cases = ReportService.get_active_cases()
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

    @staticmethod
    def get_demographics():
        users = User.objects.all()
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

    @staticmethod
    def get_decision_type_analysis():
        """Requirement 5: Mediation and Immediate Decisions."""
        from .db_models import Decision
        all_decisions = Decision.objects.all()
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

    @staticmethod
    def get_intelligence_insights():
        active_cases = ReportService.get_active_cases()
        total_cases = active_cases.count()
        
        # 1. Most common issue
        most_common = active_cases.exclude(main_issue__isnull=True).values('main_issue').annotate(count=Count('id')).order_by('-count').first()
        common_txt = most_common['main_issue'] if most_common else "N/A"

        # 2. Least reported case type
        case_types = active_cases.values('category__name').annotate(total=Count('id')).order_by('total')
        least_txt = case_types.first()['category__name'] if case_types.exists() else "N/A"

        # 3. Most active judge (Highest resolved count)
        from .db_models import Decision
        active_judge = Decision.objects.filter(status='FINALIZED')\
            .values('judge__first_name', 'judge__last_name')\
            .annotate(resolved_count=Count('id'))\
            .order_by('-resolved_count').first()
        judge_txt = f"{active_judge['judge__first_name']} {active_judge['judge__last_name']}" if active_judge else "N/A"

        # 4. Biggest backlog (Category with most non-closed cases)
        backlog = active_cases.exclude(status='CLOSED').values('category__name').annotate(count=Count('id')).order_by('-count').first()
        backlog_txt = backlog['category__name'] if backlog else "N/A"
        
        return {
            "insights": [
                f"Most Common Issue: {common_txt}",
                f"Least Reported Case Type: {least_txt}",
                f"Most Active Judge: {judge_txt}",
                f"Biggest Backlog: {backlog_txt} cases"
            ],
            "stats": {
                "common_issue": common_txt,
                "least_reported_type": least_txt,
                "active_judge": judge_txt,
                "backlog_category": backlog_txt
            }
        }

    @classmethod
    def get_master_analytics(cls):
        return {
            "case_type_analysis": cls.get_case_type_analysis(),
            "dispute_analysis": cls.get_dispute_analysis(),
            "court_problems": cls.get_court_problems(),
            "resolution_time_metrics": cls.get_resolution_time_metrics(),
            "demographics": cls.get_demographics(),
            "decision_analysis": cls.get_decision_type_analysis(),
            "intelligence_insights": cls.get_intelligence_insights(),
            "generated_at": timezone.now()
        }
