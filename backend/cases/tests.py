from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
from unittest.mock import patch
from .models import CaseCategory, Case, CaseDocument, JudgeAssignment, JudgeProfile
from .services import JudgeAssignmentService, CaseReviewService

User = get_user_model()


class CaseModelTests(TestCase):
    """Test Case model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            phone_number='+1234567891'
        )
        
        self.category, _ = CaseCategory.objects.get_or_create(
            name='Test Category',
            code='TEST-001',
            defaults={'description': 'Test Description'}
        )

    
    def test_create_case(self):
        """Test creating a case"""
        case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.user
        )
        
        self.assertEqual(case.title, 'Test Case')
        self.assertEqual(case.status, 'PENDING_REVIEW')
        self.assertIsNotNone(case.id)
    
    def test_generate_file_number(self):
        """Test file number generation"""
        case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.user
        )
        
        case.status = 'APPROVED'
        case.save()
        
        self.assertIsNotNone(case.file_number)
        self.assertTrue(case.file_number.startswith('JH-'))
    
    def test_case_str_representation(self):
        """Test string representation"""
        case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.user
        )
        
        case.status = 'APPROVED'
        case.file_number = 'JH-2024-0001'
        case.save()
        
        self.assertEqual(str(case), 'JH-2024-0001 - Test Case')


class CaseAPITests(APITestCase):
    """Test Case API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='admin123',
            first_name='Admin',
            last_name='User',
            phone_number='+1111111111',
            role='ADMIN'
        )
        
        self.citizen = User.objects.create_user(
            email='citizen@example.com',
            password='citizen123',
            first_name='Citizen',
            last_name='User',
            phone_number='+2222222222',
            role='CITIZEN'
        )
        
        self.registrar = User.objects.create_user(
            email='registrar@example.com',
            password='registrar123',
            first_name='Registrar',
            last_name='User',
            phone_number='+3333333333',
            role='REGISTRAR'
        )
        
        self.defendant = User.objects.create_user(
            email='defendant@example.com',
            password='defendant123',
            first_name='Defendant',
            last_name='User',
            phone_number='+9999999999',
            role='CITIZEN'
        )
        
        self.judge = User.objects.create_user(
            email='judge@example.com',
            password='judge123',
            first_name='Judge',
            last_name='User',
            phone_number='+4444444444',
            role='JUDGE'
        )
        
        # Create category
        self.category, _ = CaseCategory.objects.get_or_create(
            code='CIV-001',
            defaults={'name': 'Civil'}
        )

        
        # Create test case
        self.case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.citizen
        )
    
    def test_create_case_authenticated(self):
        """Test case creation with authentication"""
        self.client.force_authenticate(user=self.citizen)
        
        url = '/api/cases/'
        data = {
            'title': 'New Case',
            'description': 'New Description',
            'category': str(self.category.id),
            'priority': 'HIGH',
            'defendant': str(self.defendant.id)
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Case.objects.count(), 2)
    
    def test_create_case_unauthenticated(self):
        """Test case creation without authentication"""
        url = '/api/cases/'
        data = {
            'title': 'New Case',
            'description': 'New Description',
            'category': str(self.category.id)
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_my_cases(self):
        """Test listing user's cases"""
        self.client.force_authenticate(user=self.citizen)
        
        url = '/api/cases/my_cases/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_pending_review_cases(self):
        """Test listing pending cases (registrar only)"""
        self.client.force_authenticate(user=self.registrar)
        
        url = '/api/cases/pending_review/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_citizen_cannot_access_pending_review(self):
        """Test citizen cannot access pending cases"""
        self.client.force_authenticate(user=self.citizen)
        
        url = '/api/cases/pending_review/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_review_case_accept(self):
        """Test accepting a case"""
        self.client.force_authenticate(user=self.registrar)
        
        url = f'/api/cases/{self.case.id}/review/'
        data = {
            'action': 'accept',
            'court_name': 'City Court',
            'court_room': 'Room 101'
        }
        
        with patch('cases.services.JudgeAssignmentService.assign_judge') as mock_assign:
            mock_assign.return_value = None
            
            response = self.client.post(url, data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Refresh case
            self.case.refresh_from_db()
            self.assertEqual(self.case.status, 'APPROVED')
            self.assertIsNotNone(self.case.file_number)
    
    def test_review_case_reject(self):
        """Test rejecting a case"""
        self.client.force_authenticate(user=self.registrar)
        
        url = f'/api/cases/{self.case.id}/review/'
        data = {
            'action': 'reject',
            'rejection_reason': 'Insufficient documents'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh case
        self.case.refresh_from_db()
        self.assertEqual(self.case.status, 'REJECTED')
        self.assertEqual(self.case.rejection_reason, 'Insufficient documents')
    
    def test_case_detail(self):
        """Test getting case details"""
        self.client.force_authenticate(user=self.citizen)
        
        url = f'/api/cases/{self.case.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Case')
    
    def test_case_timeline(self):
        """Test getting case timeline"""
        self.client.force_authenticate(user=self.citizen)
        
        url = f'/api/cases/{self.case.id}/timeline/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)


class JudgeAssignmentServiceTests(TestCase):
    """Test Judge Assignment Service"""
    
    def setUp(self):
        self.category, _ = CaseCategory.objects.get_or_create(
            code='CIV-001',
            defaults={'name': 'Civil'}
        )

        
        self.judge_user = User.objects.create_user(
            email='judge@example.com',
            password='judge123',
            first_name='Judge',
            last_name='User',
            role='JUDGE',
            is_active=True
        )
        
        self.judge_profile = JudgeProfile.objects.create(
            user=self.judge_user,
            max_active_cases=3,
            is_active=True
        )
        self.judge_profile.specializations.add(self.category)
    
    def test_find_available_judges(self):
        """Test finding available judges"""
        available = JudgeAssignmentService.find_available_judges(self.category.id)
        
        self.assertEqual(len(available), 1)
        self.assertEqual(available[0]['judge'], self.judge_user)
        self.assertEqual(available[0]['active_count'], 0)
    
    def test_judge_workload_limit(self):
        """Test judge workload limit"""
        # Create 3 active assignments (max)
        for i in range(3):
            case = Case.objects.create(
                title=f'Case {i}',
                description='Test',
                category=self.category,
                created_by=self.judge_user
            )
            JudgeAssignment.objects.create(
                case=case,
                judge=self.judge_user,
                assigned_by=self.judge_user,
                is_active=True
            )
        
        # Refresh profile
        self.judge_profile.refresh_from_db()
        
        self.assertEqual(self.judge_profile.get_active_case_count(), 3)
        self.assertFalse(self.judge_profile.can_take_more_cases())
        
        # Should find no available judges
        available = JudgeAssignmentService.find_available_judges(self.category.id)
        self.assertEqual(len(available), 0)