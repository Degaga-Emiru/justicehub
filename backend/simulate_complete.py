import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from hearings.views import HearingViewSet
from hearings.models import Hearing
import json

User = get_user_model()
judge = User.objects.filter(role='JUDGE').first()

if not judge:
    print("No judge found")
    exit()

hearing = Hearing.objects.filter(judge=judge, status='SCHEDULED').first()
if not hearing:
    print("No scheduled hearing found")
    exit()

print(f"Testing on hearing {hearing.id} for case {hearing.case.file_number}")

factory = RequestFactory()
data = {
    "notes": {
        "summary": "This is a test summary",
        "action": "resolved",
        "details": "Details here"
    }
}

from rest_framework.test import force_authenticate
request = factory.post('/api/hearings/{}/complete/'.format(hearing.id), data=json.dumps(data), content_type='application/json')
force_authenticate(request, user=judge)
request.user = judge

view = HearingViewSet.as_view({'post': 'complete'})
response = view(request, pk=hearing.id)

print(f"Response status: {response.status_code}")
print(f"Response data: {response.data}")

if response.status_code == 200:
    print(f"Hearing status is now: {Hearing.objects.get(id=hearing.id).status}")
    
    # Try finalize decision
    from decisions.services import DecisionWorkflowService
    from decisions.models import Decision
    
    decision = Decision.objects.filter(case=hearing.case, status=Decision.DecisionStatus.DRAFT).first()
    if not decision:
        decision = Decision.objects.create(
            case=hearing.case,
            judge=judge,
            title="Test Decision",
            decision_type=Decision.DecisionType.FINAL,
            introduction="Intro",
            background="Back",
            analysis="Anal",
            conclusion="Conc",
            order="Ord"
        )
        print("Created draft decision")
    
    try:
        DecisionWorkflowService.finalize_decision(decision, judge)
        print("Finalized successfully!")
    except Exception as e:
        print(f"Failed to finalize: {e}")
