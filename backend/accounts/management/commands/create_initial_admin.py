from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Create initial admin user if no admin exists'

    def handle(self, *args, **options):
        # Check if any admin exists
        if User.objects.filter(role='ADMIN').exists():
            self.stdout.write(
                self.style.SUCCESS('Admin user already exists. Skipping creation.')
            )
            return

        try:
            # Get admin details from environment variables
            admin_email = os.getenv('INITIAL_ADMIN_EMAIL', 'admin@justicehub.com')
            admin_password = os.getenv('INITIAL_ADMIN_PASSWORD', 'Admin@123')
            admin_first_name = os.getenv('INITIAL_ADMIN_FIRST_NAME', 'System')
            admin_last_name = os.getenv('INITIAL_ADMIN_LAST_NAME', 'Administrator')
            admin_phone = os.getenv('INITIAL_ADMIN_PHONE', '+1234567890')

            # Create superuser
            admin = User.objects.create_superuser(
                email=admin_email,
                password=admin_password,
                first_name=admin_first_name,
                last_name=admin_last_name,
                phone_number=admin_phone,
                role='ADMIN',
                is_verified=True,
                is_active=True
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created admin user: {admin_email}'
                )
            )

            # Create default data
            self.create_default_statuses()
            self.create_default_categories()

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin user: {str(e)}')
            )

    def create_default_statuses(self):
        from cases.models import CaseStatus

        statuses = [
            ('PENDING_REVIEW', 'Pending Review'),
            ('ACCEPTED', 'Accepted'),
            ('REJECTED', 'Rejected'),
            ('ASSIGNED', 'Assigned'),
            ('IN_PROGRESS', 'In Progress'),
            ('CLOSED', 'Closed'),
        ]

        for status_code, status_name in statuses:
            CaseStatus.objects.get_or_create(
                name=status_code,
                defaults={'name': status_name}
            )

        self.stdout.write(self.style.SUCCESS('Created default case statuses'))

    def create_default_categories(self):
        from cases.models import CaseCategory

        categories = [
            ('CIV-001', 'Civil Litigation', 'Civil cases including property disputes'),
            ('CRM-001', 'Criminal Law', 'Criminal cases including theft'),
            ('FAM-001', 'Family Law', 'Divorce and custody cases'),
        ]

        for code, name, desc in categories:
            CaseCategory.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'is_active': True
                }
            )

        self.stdout.write(self.style.SUCCESS('Created default case categories'))