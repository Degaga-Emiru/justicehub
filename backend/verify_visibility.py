import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from decisions.models import Decision
from cases.models import Case, CaseCategory, CaseStatus, JudgeAssignment
from rest_framework.test import APIClient

User = get_user_model()

def run_visibility_test():
    client = APIClient()
    
    import random
    
    judge1 = User.objects.filter(email='judge1_vis@example.com').first()
    if not judge1:
        phone1 = f"+2519{random.randint(10000000, 99999999)}"
        judge1 = User.objects.create_user(
            email='judge1_vis@example.com',
            password='password123',
            role='JUDGE',
            first_name='Judge',
            last_name='One',
            phone_number=phone1
        )
    
    judge2 = User.objects.filter(email='judge2_vis@example.com').first()
    if not judge2:
        phone2 = f"+2519{random.randint(10000000, 99999999)}"
        judge2 = User.objects.create_user(
            email='judge2_vis@example.com',
            password='password123',
            role='JUDGE',
            first_name='Judge',
            last_name='Two',
            phone_number=phone2
        )
        
    category, _ = CaseCategory.objects.get_or_create(name='Visibility Test Civil', code='CIV-VIS-001')
    
    # Case 1 Assigned to Judge 1
    case1 = Case.objects.create(
        title='Case for Judge 1',
        description='Description',
        category=category,
        created_by=judge1,
        status=CaseStatus.StatusChoices.ASSIGNED
    )
    JudgeAssignment.objects.create(case=case1, judge=judge1, assigned_by=judge1, is_active=True)
    
    decision1 = Decision.objects.create(
        case=case1,
        judge=judge1,
        title='Decision by Judge 1',
        decision_type=Decision.DecisionType.FINAL,
        status=Decision.DecisionStatus.DRAFT
    )
    
    # Case 2 Assigned to Judge 2
    case2 = Case.objects.create(
        title='Case for Judge 2',
        description='Description',
        category=category,
        created_by=judge2,
        status=CaseStatus.StatusChoices.ASSIGNED
    )
    JudgeAssignment.objects.create(case=case2, judge=judge2, assigned_by=judge2, is_active=True)
    
    decision2 = Decision.objects.create(
        case=case2,
        judge=judge2,
        title='Decision by Judge 2',
        decision_type=Decision.DecisionType.FINAL,
        status=Decision.DecisionStatus.PUBLISHED # Make it published so old logic would have shown it
    )

    print("--- Test 1: List Decisions (get_queryset) ---")
    client.force_authenticate(user=judge1)
    response = client.get('/api/decisions/', SERVER_NAME='127.0.0.1')
    
    if response.status_code == 200:
        results = response.data if isinstance(response.data, list) else response.data.get('results', [])
        print(f"Judge 1 sees {len(results)} decisions.")
        
        seen_ids = [str(r['id']) for r in results]
        
        if str(decision1.id) in seen_ids:
            print("SUCCESS: Judge 1 sees their own decision.")
        else:
            print("FAILED: Judge 1 does NOT see their own decision.")
            
        if str(decision2.id) in seen_ids:
            print("FAILED: Judge 1 sees Judge 2's decision (Bug is present).")
        else:
            print("SUCCESS: Judge 1 does NOT see Judge 2's decision (Bug is fixed).")
    else:
        print(f"FAILED: /api/decisions/ returned {response.status_code}")

    print("\n--- Test 2: Retrieve Specific Decision (has_object_permission) ---")
    
    # Judge 1 tries to access Judge 2's decision directly
    response = client.get(f'/api/decisions/{decision2.id}/', SERVER_NAME='127.0.0.1')
    
    if response.status_code == 403 or response.status_code == 404:
        print(f"SUCCESS: Judge 1 cannot access Judge 2's decision directly (Status: {response.status_code}).")
    else:
        print(f"FAILED: Judge 1 CAN access Judge 2's decision directly (Status: {response.status_code}). (Bug is present)")


if __name__ == '__main__':
    run_visibility_test()
