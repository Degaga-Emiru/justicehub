from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Create initial admin user if no admin exists'
    
    def handle(self, *args, **options):
        # Check if any admin exists
        if User.objects.filter(role='ADMIN').exists():
            self.stdout.write(self.style.SUCCESS('Admin user already exists. Skipping creation.'))
            return
        
        # Create initial admin from environment variables or defaults
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
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {admin.email}'))