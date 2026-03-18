from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from cases.models import Case, CaseCategory, CaseStatus
import datetime

User = get_user_model()

class CaseFileNumberTests(TestCase):
    """Test Case.generate_file_number robustness"""
    
    def setUp(self):
        # Create common dependencies
        self.user = User.objects.create_user(
            email='test_file_num@example.com',
            password='pass',
            first_name='Test',
            last_name='User',
            phone_number='+251977777777'
        )
        self.category = CaseCategory.objects.create(name='Test Cat', code='TEST-CAT')
        self.year = datetime.datetime.now().year
        self.prefix = f"JH-{self.year}"

    def test_generate_higher_than_deleted(self):
        """Should generate a number higher than already used numbers, even if deleted"""
        # Create a case and manually set a high file number, then delete it
        high_num = f"{self.prefix}-9000"
        c1 = Case.objects.create(
            title='Deleted Case',
            category=self.category,
            created_by=self.user,
            file_number=high_num
        )
        c1.delete() # Soft delete
        
        # New case should generate 9001
        c2 = Case(title='New Case', category=self.category, created_by=self.user)
        new_num = c2.generate_file_number()
        self.assertEqual(new_num, f"{self.prefix}-9001")

    def test_generate_higher_than_mixed_format(self):
        """Should correctly find numeric max even with 'TEST' or other non-standard formats"""
        # Lexicographically larger but numerically smaller tail
        Case.objects.create(
            title='Test Case',
            category=self.category,
            created_by=self.user,
            file_number=f"{self.prefix}-TEST-8367"
        )
        
        # Standard numeric format which is lexicographically smaller than the one above
        Case.objects.create(
            title='Numeric Case',
            category=self.category,
            created_by=self.user,
            file_number=f"{self.prefix}-8368"
        )
        
        c3 = Case(title='Next Case', category=self.category, created_by=self.user)
        new_num = c3.generate_file_number()
        # It should see 8368 and 8367 (from TEST-8367) and pick 8369
        self.assertEqual(new_num, f"{self.prefix}-8369")

    def test_empty_year(self):
        """Should start at 0001 for a new year"""
        # Mocking or just assuming no cases for current year in this test run
        c = Case(title='First Case', category=self.category, created_by=self.user)
        # Ensure we are using a different prefix if year already has cases in DB
        # But in a clean TestCase, it should be empty
        num = c.generate_file_number()
        self.assertTrue(num.endswith("-0001"))
