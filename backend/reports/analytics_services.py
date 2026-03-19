from django.db.models import Count, Avg, F, ExpressionWrapper, fields, Max, Min
from django.utils import timezone
from .db_models import Case, User, CaseCategory
from datetime import timedelta

class AnalyticsService:
    @staticmethod
    def get_case_type_analysis():
        total_cases = Case.objects.count()
        analysis = Case.objects.values('category__name').annotate(
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
        
        return {
            "distribution": results,
            "most_frequent": most_frequent
        }

    @staticmethod
    def get_dispute_analysis():
        analysis = Case.objects.exclude(main_issue__isnull=True).values('main_issue').annotate(
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
        # 1. Most common issue
        most_common = Case.objects.values('main_issue').annotate(count=Count('id')).order_by('-count').first()
        
        # 2. Longest pending cases (not resolved)
        backlog_count = Case.objects.exclude(status='CLOSED').count()
        
        # 3. Longest resolution time
        # We need a duration calculation
        resolved_cases = Case.objects.filter(status='CLOSED', closed_date__isnull=False)
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
        resolved_cases = Case.objects.filter(status='CLOSED', closed_date__isnull=False)
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
    def get_intelligence_insights():
        # Sample insight: Which education level files most cases?
        insight1 = Case.objects.values('created_by__education_level').annotate(count=Count('id')).order_by('-count').first()
        
        # Which age group has most land disputes?
        land_disputes = Case.objects.filter(main_issue__icontains='land').values('created_by__age').annotate(count=Count('id')).order_by('-count').first()
        
        return {
            "insights": [
                f"Most cases are filed by users with {insight1['created_by__education_level'] or 'unspecified'} education level." if insight1 else "No data.",
                f"Users in age group {land_disputes['created_by__age'] if land_disputes else 'N/A'} are involved in most land disputes."
            ]
        }

    @classmethod
    def get_master_analytics(cls):
        return {
            "case_type_analysis": cls.get_case_type_analysis(),
            "dispute_analysis": cls.get_dispute_analysis(),
            "court_problems": cls.get_court_problems(),
            "resolution_time_metrics": cls.get_resolution_time_metrics(),
            "demographics": cls.get_demographics(),
            "intelligence_insights": cls.get_intelligence_insights(),
            "generated_at": timezone.now()
        }
