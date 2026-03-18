from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
from decisions.models import Decision
from cases.models import Case, CaseCategory, JudgeAssignment
from hearings.models import Hearing

User = get_user_model()

class DecisionNewRulesTests(APITestCase):
    """Test new Decision validation rules and immediate decision feature"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.judge = User.objects.create_user(
            email='judge_new@example.com',
            password='testpass123',
            first_name='Judge',
            last_name='Validation',
            role='JUDGE',
            phone_number='+251933333333'
        )
        
        self.client_user = User.objects.create_user(
            email='client_new@example.com',
            password='testpass123',
            first_name='Client',
            last_name='New',
            phone_number='+251933333334'
        )
        
        # Create category and case
        self.category = CaseCategory.objects.create(name='Test', code='TEST')
        self.case = Case.objects.create(
            title='Test Case',
            category=self.category,
            created_by=self.client_user,
            plaintiff=self.client_user,
            file_number='FILE-RULES-001',
            status='IN_PROGRESS'
        )
        
        self.admin = User.objects.create_superuser(
            email='admin_new@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            phone_number='+251933333335'
        )
        
        # Assign judge
        JudgeAssignment.objects.create(
            case=self.case, 
            judge=self.judge, 
            assigned_by=self.admin,
            is_active=True
        )
        
        self.client.force_authenticate(user=self.judge)

    def test_create_standard_decision_fails_without_hearing(self):
        """Standard decision should fail if no completed hearing exists"""
        url = '/api/decisions/'
        data = {
            'case': str(self.case.id),
            'title': 'Judgment 1',
            'decision_type': 'FINAL',
            'introduction': 'Intro',
            'background': 'Back',
            'analysis': 'Analyse',
            'conclusion': 'Concl',
            'order': 'Order'
        }
        response = self.client.post(url, data, format='json')
        if response.status_code != 400:
            print(f"DEBUG: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least one hearing", str(response.data))

    def test_create_standard_decision_fails_missing_fields(self):
        """Standard decision should fail if mandatory fields are missing"""
        # First add a completed hearing
        Hearing.objects.create(
            case=self.case,
            judge=self.judge,
            title='Hearing 1',
            hearing_type='INITIAL',
            scheduled_date=timezone.now(),
            duration_minutes=30,
            location='Court Room 1',
            status='COMPLETED'
        )
        
        url = '/api/decisions/'
        data = {
            'case': str(self.case.id),
            'title': 'Judgment 1',
            'decision_type': 'FINAL',
            'introduction': 'Intro',
            # 'background' is missing
            'analysis': 'Analyse',
            'conclusion': 'Concl',
            'order': 'Order'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('background', response.data)

    def test_immediate_decision_success(self):
        """Immediate decision should succeed with only reason/description if hearing is completed"""
        # Add a completed hearing
        Hearing.objects.create(
            case=self.case,
            judge=self.judge,
            title='Hearing 1',
            hearing_type='INITIAL',
            scheduled_date=timezone.now(),
            duration_minutes=30,
            location='Court Room 1',
            status='COMPLETED'
        )
        
        url = f'/api/decisions/by-case/{self.case.id}/immediate/'
        data = {
            'reason': 'MEDIATED',
            'description': 'Case settled through mediation.'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['decision_type'], 'IMMEDIATE', response.data)
        self.assertEqual(response.data['status'], 'FINALIZED', response.data)
        
        # Verify case is closed
        self.case.refresh_from_db()
        self.assertEqual(self.case.status, 'CLOSED')

    def test_immediate_decision_fails_without_hearing(self):
        """Immediate decision should fail if no completed hearing exists"""
        url = f'/api/decisions/by-case/{self.case.id}/immediate/'
        data = {
            'reason': 'WITHDRAWN',
            'description': 'Plaintiff withdrew the case.'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least one hearing", str(response.data))

    def test_finalize_fails_without_hearing(self):
        """Finalizing a draft should fail if no completed hearing exists"""
        # Create a draft first (bypassing serializer validation for test setup if necessary, 
        # but here we can't even create a draft without a hearing now because of serializer validation)
        
        # So let's create a draft manually in DB
        decision = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Draft Decision',
            decision_type='FINAL',
            introduction='I', background='B', analysis='A', conclusion='C', order='O',
            status='DRAFT'
        )
        
        url = f'/api/decisions/{decision.id}/finalize/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least one hearing", str(response.data))
