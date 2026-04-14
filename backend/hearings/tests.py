from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import Hearing, HearingParticipant, HearingReminder
from cases.models import Case, CaseCategory

User = get_user_model()


class HearingModelTests(TestCase):
    """Test Hearing model"""
    
    def setUp(self):
        self.judge = User.objects.create_user(
            email='judge@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Judge',
            role='JUDGE'
        )
        
        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Client'
        )
        
        self.category = CaseCategory.objects.create(
            name='Test Category',
            code='TEST-001'
        )
        
        self.case = Case.objects.create(
            title='Test Case',
            description='Test Description',
            category=self.category,
            created_by=self.client_user
        )
    
    def test_create_hearing(self):
        """Test creating a hearing"""
        hearing = Hearing.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Hearing',
            hearing_type='INITIAL',
            scheduled_date=timezone.now() + timedelta(days=7),
            duration_minutes=60,
            location='Court Room 101',
            agenda='Test Agenda'
        )
        
        self.assertEqual(hearing.title, 'Test Hearing')
        self.assertEqual(hearing.status, 'SCHEDULED')
        self.assertIsNotNone(hearing.id)
    
    def test_hearing_str_representation(self):
        """Test string representation"""
        hearing = Hearing.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Hearing',
            hearing_type='INITIAL',
            scheduled_date=timezone.now() + timedelta(days=7),
            duration_minutes=60,
            location='Court Room 101',
            agenda='Test Agenda'
        )
        
        expected = f"INITIAL - {self.case.file_number} - {hearing.scheduled_date}"
        self.assertEqual(str(hearing), expected)


class HearingAPITests(APITestCase):
    """Test Hearing API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.judge = User.objects.create_user(
            email='judge@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Judge',
            role='JUDGE'
        )
        
        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Client'
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
            created_by=self.client_user
        )
        
        # Create hearing
        self.hearing = Hearing.objects.create(
            case=self.case,
            judge=self.judge,
            title='Test Hearing',
            hearing_type='INITIAL',
            scheduled_date=timezone.now() + timedelta(days=7),
            duration_minutes=60,
            location='Court Room 101',
            agenda='Test Agenda'
        )
        
        # Add participant
        self.participant = HearingParticipant.objects.create(
            hearing=self.hearing,
            user=self.client_user,
            role_in_hearing='Plaintiff'
        )
    
    def test_list_hearings_authenticated(self):
        """Test listing hearings with authentication"""
        self.client.force_authenticate(user=self.client_user)
        
        url = '/api/hearings/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_create_hearing_judge(self):
        """Test creating hearing as judge"""
        self.client.force_authenticate(user=self.judge)
        
        url = '/api/hearings/'
        data = {
            'case': str(self.case.id),
            'title': 'New Hearing',
            'hearing_type': 'STATUS',
            'scheduled_date': (timezone.now() + timedelta(days=14)).isoformat(),
            'duration_minutes': 45,
            'location': 'Court Room 102',
            'agenda': 'Status Conference'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # 1 standard hearing created in setUp + 1 new = 2
        self.assertEqual(Hearing.objects.count(), 2)
    
    def test_create_hearing_client_forbidden(self):
        """Test client cannot create hearing"""
        self.client.force_authenticate(user=self.client_user)
        
        url = '/api/hearings/'
        data = {
            'case': str(self.case.id),
            'title': 'New Hearing',
            'hearing_type': 'STATUS',
            'scheduled_date': (timezone.now() + timedelta(days=14)).isoformat(),
            'duration_minutes': 45,
            'location': 'Court Room 102',
            'agenda': 'Status Conference'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_confirm_attendance(self):
        """Test confirming attendance"""
        self.client.force_authenticate(user=self.client_user)
        
        url = f'/api/hearings/{self.hearing.id}/confirm-attendance/'
        data = {
            'participant_role': 'Plaintiff'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.participant.refresh_from_db()
        self.assertEqual(self.participant.confirmation_status, 'CONFIRMED')
    
    def test_cancel_hearing_judge(self):
        """Test cancelling hearing as judge"""
        self.client.force_authenticate(user=self.judge)
        
        url = f'/api/hearings/{self.hearing.id}/cancel/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.hearing.refresh_from_db()
        self.assertEqual(self.hearing.status, 'CANCELLED')
    
    def test_complete_hearing_judge(self):
        """Test completing hearing as judge with new structured fields"""
        self.client.force_authenticate(user=self.judge)
        
        url = f'/api/hearings/{self.hearing.id}/complete/'
        data = {
            'summary': 'The parties agreed to a settlement.',
            'action': 'RESOLVED',
            'judge_comment': 'Good progress.',
            'minutes': 'The hearing lasted 30 minutes.'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.hearing.refresh_from_db()
        self.assertEqual(self.hearing.status, 'CONDUCTED')
        self.assertEqual(self.hearing.summary, 'The parties agreed to a settlement.')
        self.assertEqual(self.hearing.action, 'RESOLVED')
    
    def test_get_participants(self):
        """Test getting hearing participants"""
        self.client.force_authenticate(user=self.judge)
        
        url = f'/api/hearings/{self.hearing.id}/participants/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['role_in_hearing'], 'Plaintiff')
    
    def test_upcoming_hearings(self):
        """Test getting upcoming hearings"""
        self.client.force_authenticate(user=self.client_user)
        
        url = '/api/hearings/upcoming/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)