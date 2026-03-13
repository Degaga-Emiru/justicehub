import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from decisions.models import Decision
from cases.models import Case, CaseCategory, CaseStatus, JudgeAssignment
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

def debug():
    import random
    email = f"judge_debug_{random.randint(1000, 9999)}@example.com"
    judge = User.objects.create_user(
        email=email,
        password='password123',
        role='JUDGE',
        first_name='Debug',
        last_name='Judge'
    )
    
    category, _ = CaseCategory.objects.get_or_create(name='Debug Civil', code='CIV-DEBUG')
    case = Case.objects.create(
        title='Debug Case',
        description='Description',
        category=category,
        created_by=judge,
        status=CaseStatus.StatusChoices.ASSIGNED
    )
    
    JudgeAssignment.objects.create(case=case, judge=judge, assigned_by=judge, is_active=True)
    
    decision = Decision.objects.create(
        case=case,
        judge=judge,
        title='Debug Decision',
        decision_type=Decision.DecisionType.FINAL,
        status=Decision.DecisionStatus.DRAFT
    )
    
    print(f"Judge ID: {judge.id}, Role: {judge.role}")
    print(f"Decision Judge ID: {decision.judge.id}")
    
    client = APIClient()
    client.force_authenticate(user=judge)
    
    # Check if we can get the decision via GET
    response = client.get(f"/api/decisions/{decision.id}/")
    print(f"GET Decision Status: {response.status_code}, Type: {type(response)}")
    if hasattr(response, 'data'):
        print(f"GET Data: {response.data}")
    else:
        print("Response has NO data attribute")

    # Check Upload
    pdf_content = b"%PDF-1.4 test"
    uploaded_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
    response = client.post(
        f"/api/decisions/{decision.id}/upload-decision-document/",
        {'file': uploaded_file},
        format='multipart'
    )
    print(f"POST Upload Status: {response.status_code}")
    if response.status_code != 201:
        print(f"POST Data: {response.data}")

if __name__ == '__main__':
    debug()
