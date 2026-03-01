from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch
from .models import Decision, DecisionDelivery
from cases.models import Case, CaseCategory

User = get_user_model()


class DecisionModelTests(TestCase):
    """Test Decision model"""
    
    def setUp(self):
        self.judge = User.objects.create_user(
            email='judge@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Judge',
            role='JUDGE',
            phone_number='+251922222221'
        )
        
        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Client',
            phone_number='+251922222222'
        )
        
        self.category = CaseCategory.objects.create(
            name='Test Category',
            code='TEST-001'
        )
        
        self.case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.client_user,
            file_number='FILE-001'
        )
    
    def test_create_decision(self):
        """Test creating a decision"""
        decision = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Decision',
            decision_type='FINAL',
            introduction='Test Introduction',
            background='Test Background',
            analysis='Test Analysis',
            conclusion='Test Conclusion',
            order='Test Order'
        )
        
        self.assertEqual(decision.title, 'Test Decision')
        self.assertIsNotNone(decision.decision_number)
        self.assertFalse(decision.is_published)
    
    def test_decision_number_generation(self):
        """Test decision number generation"""
        decision1 = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Decision 1',
            decision_type='FINAL',
            introduction='Test',
            background='Test',
            analysis='Test',
            conclusion='Test',
            order='Test'
        )
        
        decision2 = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Decision 2',
            decision_type='FINAL',
            introduction='Test',
            background='Test',
            analysis='Test',
            conclusion='Test',
            order='Test'
        )
        
        self.assertNotEqual(decision1.decision_number, decision2.decision_number)
        self.assertTrue(decision1.decision_number.startswith('JD-'))
    
    def test_decision_str_representation(self):
        """Test string representation"""
        decision = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Decision',
            decision_type='FINAL',
            introduction='Test',
            background='Test',
            analysis='Test',
            conclusion='Test',
            order='Test'
        )
        
        expected = f"{decision.decision_number} - {self.case.file_number}"
        self.assertEqual(str(decision), expected)


class DecisionAPITests(APITestCase):
    """Test Decision API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.judge = User.objects.create_user(
            email='judge@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Judge',
            role='JUDGE',
            phone_number='+251911111111'
        )
        
        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Client',
            phone_number='+251911111112'
        )
        
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='User',
            phone_number='+251911111113'
        )
        
        # Create category and case
        self.category = CaseCategory.objects.create(
            name='Test Category',
            code='TEST-001'
        )
        
        self.case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.client_user,
            plaintiff=self.client_user,
            defendant=self.other_user,
            file_number='FILE-001'
        )
        
        # Create decision
        self.decision = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Decision',
            decision_type='FINAL',
            introduction='Test Introduction',
            background='Test Background',
            analysis='Test Analysis',
            conclusion='Test Conclusion',
            order='Test Order'
        )
    
    def test_list_decisions_authenticated(self):
        """Test listing decisions with authentication"""
        self.client.force_authenticate(user=self.client_user)
        
        url = '/api/decisions/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_create_decision_judge(self):
        """Test creating decision as judge"""
        self.client.force_authenticate(user=self.judge)
        
        # Create a fresh case to avoid "decision already exists" validation error
        new_case = Case.objects.create(
            title='New Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.client_user,
            plaintiff=self.client_user,
            defendant=self.other_user,
            file_number='NEW-CASE-001'
        )
        
        url = '/api/decisions/'
        data = {
            'case': str(new_case.id),
            'title': 'New Decision',
            'decision_type': 'FINAL',
            'introduction': 'New Introduction',
            'background': 'New Background',
            'analysis': 'New Analysis',
            'conclusion': 'New Conclusion',
            'order': 'New Order',
            'laws_cited': 'Law 1, Law 2',
            'cases_cited': 'Case 1, Case 2'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decision.objects.filter(case=new_case).count(), 1)
    
    def test_create_decision_client_forbidden(self):
        """Test client cannot create decision"""
        self.client.force_authenticate(user=self.client_user)
        
        url = '/api/decisions/'
        data = {
            'case': str(self.case.id),
            'title': 'New Decision',
            'decision_type': 'FINAL',
            'introduction': 'New Introduction',
            'background': 'New Background',
            'analysis': 'New Analysis',
            'conclusion': 'New Conclusion',
            'order': 'New Order'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_publish_decision(self):
        """Test publishing a decision"""
        with patch('decisions.views.generate_decision_pdf') as mock_generate, \
             patch('decisions.views.deliver_decision') as mock_deliver:
            
            self.client.force_authenticate(user=self.judge)
            
            url = f'/api/decisions/{self.decision.id}/publish/'
            data = {'confirm': True}
            
            response = self.client.post(url, data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            self.decision.refresh_from_db()
            self.assertTrue(self.decision.is_published)
            self.assertIsNotNone(self.decision.published_at)
            mock_deliver.assert_called_once_with(self.decision)
    
    def test_download_pdf_not_found(self):
        """Test downloading non-existent PDF"""
        self.client.force_authenticate(user=self.client_user)
        
        url = f'/api/decisions/{self.decision.id}/download-pdf/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_deliveries(self):
        """Test getting decision deliveries"""
        # Create a delivery
        DecisionDelivery.objects.create(
            decision=self.decision,
            recipient=self.client_user,
            method='EMAIL'
        )
        
        self.client.force_authenticate(user=self.judge)
        
        url = f'/api/decisions/{self.decision.id}/deliveries/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_acknowledge_decision(self):
        """Test acknowledging decision receipt"""
        delivery = DecisionDelivery.objects.create(
            decision=self.decision,
            recipient=self.client_user,
            method='EMAIL'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        url = f'/api/decisions/{self.decision.id}/acknowledge/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        delivery.refresh_from_db()
        self.assertIsNotNone(delivery.acknowledged_at)
    
    def test_published_decisions_filter(self):
        """Test filtering published decisions"""
        # Publish the decision
        self.decision.is_published = True
        self.decision.published_at = timezone.now()
        self.decision.save()
        
        self.client.force_authenticate(user=self.client_user)
        
        url = '/api/decisions/published/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_recent_decisions(self):
        """Test getting recent decisions"""
        self.client.force_authenticate(user=self.judge)
        
        url = '/api/decisions/recent/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)