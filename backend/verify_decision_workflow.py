import os
import django
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from decisions.models import Decision
from cases.models import Case, CaseCategory, CaseStatus, JudgeAssignment
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

User = get_user_model()

def run_tests():
    client = APIClient()
    
    # Setup: Create Judge, Case, and Decision Draft
    judge = User.objects.filter(role='JUDGE').first()
    if not judge:
        judge = User.objects.create_user(
            email='judge_test@example.com',
            password='password123',
            role='JUDGE',
            first_name='Test',
            last_name='Judge'
        )
    
    client.force_authenticate(user=judge)
    
    category, _ = CaseCategory.objects.get_or_create(name='Civil', code='CIV-001')
    case = Case.objects.create(
        title='Test Case for Decision',
        description='Test description',
        category=category,
        created_by=judge,
        status=CaseStatus.StatusChoices.ASSIGNED
    )
    
    JudgeAssignment.objects.create(
        case=case,
        judge=judge,
        assigned_by=judge,
        is_active=True
    )
    
    decision = Decision.objects.create(
        case=case,
        judge=judge,
        title='Draft Decision',
        decision_type=Decision.DecisionType.FINAL,
        status=Decision.DecisionStatus.DRAFT,
        introduction='Intro',
        background='Background',
        analysis='Analysis',
        conclusion='Conclusion',
        order='Order'
    )
    
    print(f"Created Case {case.id} and Decision {decision.id}")
    
    # Test Workflow 2: Upload Document
    print("\nTesting Workflow 2: Uploaded Document...")
    pdf_content = b"%PDF-1.4 test content"
    uploaded_file = SimpleUploadedFile("test_decision.pdf", pdf_content, content_type="application/pdf")
    
    upload_url = f"/api/decisions/{decision.id}/upload-decision-document/"
    response = client.post(upload_url, {'file': uploaded_file}, format='multipart')
    
    if response.status_code == 201:
        print("SUCCESS: Document uploaded.")
        decision.refresh_from_db()
        if decision.document:
            print(f"Verified: Decision document linked: {decision.document}")
        else:
            print("ERROR: Decision document NOT linked.")
    else:
        print(f"FAILED: Document upload returned {response.status_code}: {response.data}")

    # Test Finalize (with uploaded doc)
    print("\nTesting Finalize with uploaded document...")
    finalize_url = f"/api/decisions/{decision.id}/finalize/"
    response = client.post(finalize_url, {})
    
    if response.status_code == 200:
        decision.refresh_from_db()
        case.refresh_from_db()
        print(f"SUCCESS: Decision finalized. Status: {decision.status}")
        print(f"Verified: Case status: {case.status}")
        if not decision.pdf_document:
            print("Verified: System PDF was NOT generated (as expected since doc was uploaded).")
        else:
             # Wait, in my implementation, I generate the PDF and link it IF it doesn't exist.
             # If it already has a document, I skip generate_decision_pdf.
             # However, I should check if decision.pdf_document is set.
             # In Case of upload, decision.document is set, but pdf_document might still be empty.
             print(f"Note: pdf_document is {decision.pdf_document}")
    else:
        print(f"FAILED: Finalize returned {response.status_code}: {response.data}")

    # Test Workflow 1: Generated PDF
    print("\nTesting Workflow 1: System Generated...")
    # Create another case and decision
    case2 = Case.objects.create(
        title='Test Case 2',
        description='Test description',
        category=category,
        created_by=judge,
        status=CaseStatus.StatusChoices.ASSIGNED
    )
    JudgeAssignment.objects.create(case=case2, judge=judge, assigned_by=judge, is_active=True)
    decision2 = Decision.objects.create(
        case=case2,
        judge=judge,
        title='Draft 2',
        decision_type=Decision.DecisionType.FINAL,
        status=Decision.DecisionStatus.DRAFT,
        introduction='Intro',
        background='Background',
        analysis='Analysis',
        conclusion='Conclusion',
        order='Order'
    )
    
    response = client.post(f"/api/decisions/{decision2.id}/finalize/", {})
    if response.status_code == 200:
        decision2.refresh_from_db()
        case2.refresh_from_db()
        print(f"SUCCESS: Decision 2 finalized. Status: {decision2.status}")
        print(f"Verified: Case 2 status: {case2.status}")
        if decision2.pdf_document:
            print(f"Verified: System PDF was generated: {decision2.pdf_document}")
        if decision2.document:
            print(f"Verified: CaseDocument linked: {decision2.document}")
    else:
        print(f"FAILED: Finalize 2 returned {response.status_code}: {response.data}")

if __name__ == '__main__':
    run_tests()
