from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Hearing, HearingParticipant
from cases.models import Case, CaseCategory

User = get_user_model()

class HearingRefactoringTests(APITestCase):
    """Test new refactored features: Dynamic PATCH and next-hearing linking"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.judge = User.objects.create_user(
            email='judge@refactor.com',
            password='testpass123',
            first_name='Judge',
            last_name='Dred',
            role='JUDGE'
        )
        
        self.clerk = User.objects.create_user(
            email='clerk@refactor.com',
            password='testpass123',
            role='CLERK'
        )
        
        self.defendant = User.objects.create_user(
            email='defendant@refactor.com',
            password='testpass123',
            first_name='Defen',
            last_name='Dant'
        )
        
        # Create category and case
        self.category = CaseCategory.objects.create(name='Refactor', code='REF-01')
        self.case = Case.objects.create(
            title='Refactor Case',
            description='Test Descr',
            category=self.category,
            defendant=self.defendant
        )
        
        # Create hearing
        self.hearing = Hearing.objects.create(
            case=self.case,
            judge=self.judge,
            title='Refactor Hearing',
            hearing_type='INITIAL',
            scheduled_date=timezone.now() + timedelta(days=7),
            duration_minutes=60,
            location='Room A',
            agenda='Initial Agenda'
        )
        
        # Add participant
        HearingParticipant.objects.create(
            hearing=self.hearing,
            user=self.defendant,
            role_in_hearing='Defendant'
        )

    def test_dynamic_patch_update(self):
        """Test that any allowed attribute can be updated via PATCH"""
        self.client.force_authenticate(user=self.judge)
        url = f'/api/hearings/{self.hearing.id}/'
        
        # Update multiple fields at once
        data = {
            'title': 'Updated Title',
            'location': 'Room B',
            'agenda': 'Updated Agenda',
            'is_public': True
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.hearing.refresh_from_db()
        self.assertEqual(self.hearing.title, 'Updated Title')
        self.assertEqual(self.hearing.location, 'Room B')
        self.assertEqual(self.hearing.agenda, 'Updated Agenda')
        self.assertTrue(self.hearing.is_public)

    def test_dynamic_patch_protected_fields(self):
        """Test that protected fields (like case) are NOT updated via PATCH"""
        self.client.force_authenticate(user=self.judge)
        url = f'/api/hearings/{self.hearing.id}/'
        
        new_case = Case.objects.create(title='Another Case', category=self.category)
        data = {
            'title': 'New Title',
            'case': str(new_case.id) # Attempting to change case
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.hearing.refresh_from_db()
        self.assertEqual(self.hearing.title, 'New Title')
        # Case should still be the original one
        self.assertEqual(self.hearing.case.id, self.case.id)

    def test_next_hearing_linking(self):
        """Test dedicated next-hearing endpoint and linking"""
        self.client.force_authenticate(user=self.judge)
        url = f'/api/hearings/{self.hearing.id}/next-hearing/'
        
        next_date = timezone.now() + timedelta(days=14)
        data = {
            'scheduled_date': next_date.isoformat(),
            'title': 'Follow-up Session',
            'agenda': 'Discuss evidence'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        new_hearing_id = response.data['id']
        new_hearing = Hearing.objects.get(id=new_hearing_id)
        
        # Verify linking
        self.assertEqual(new_hearing.previous_hearing.id, self.hearing.id)
        self.assertEqual(new_hearing.title, 'Follow-up Session')
        self.assertEqual(new_hearing.case.id, self.case.id)
        
        # Verify participants were copied
        self.assertEqual(new_hearing.participant_list.count(), self.hearing.participant_list.count())
        self.assertTrue(new_hearing.participant_list.filter(user=self.defendant).exists())
