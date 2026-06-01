import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from django.db.models import Count
from cases.models import Case, JudgeProfile, JudgeAssignment
from accounts.models import User

print('--- Judge availability ---')
judges = User.objects.filter(role='JUDGE', is_active=True)
print('Total active judges:', judges.count())
print('Judges with JudgeProfile:', judges.filter(judge_profile__isnull=False).count())
print('\n--- Judge profiles and specializations ---')
for jp in JudgeProfile.objects.annotate(spec_count=Count('specializations')).all()[:50]:
    print(jp.user.email, 'active=', jp.is_active, 'specs=', jp.specializations.count(), 'max=', jp.max_active_cases, 'active_cases=', jp.get_active_case_count())

print('\n--- Paid but unassigned cases (sample 20) ---')
paid_unassigned = Case.objects.filter(status='PAID').exclude(judge_assignments__is_active=True)
print('Count:', paid_unassigned.count())
for c in paid_unassigned.select_related('category','created_by')[:20]:
    print(c.file_number or str(c.id), '-', c.title[:60].replace('\n',' '), '| category=', getattr(c.category, 'name', None), '| created_by=', c.created_by.email)

print('\n--- Judges currently at capacity (active_cases >= max) ---')
for jp in JudgeProfile.objects.all():
    if jp.get_active_case_count() >= jp.max_active_cases:
        print(jp.user.email, 'active_cases=', jp.get_active_case_count(), 'max=', jp.max_active_cases)

print('\nDone')
