from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from .db_models import Case, CaseCategory, JudgeAssignment, Payment
import uuid
from django.utils import timezone

User = get_user_model()

class ReportingTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            email='judge@test.com',
            phone_number='123456789',
            password='password123',
            role='JUDGE'
        )
        self.client.force_login(self.user)
        
        # Create categories and cases in the DB using Raw SQL since models are unmanaged
        # However, for testing, we can try to use the shadow models if we use a DB that has these tables.
        # Since 'manage.py test' creates a fresh DB, we need to ensure the tables exist.
        pass

    def test_judge_report_endpoint(self):
        url = reverse('judge-personal-report')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('report_id', response.json())

    def test_export_csv(self):
        url = reverse('judge-personal-report') + '?format=csv'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')

    def test_export_pdf(self):
        url = reverse('judge-personal-report') + '?format=pdf'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
