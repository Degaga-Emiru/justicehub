import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    admin_user = User.objects.get(email='admin@justicehub.com')
    admin_user.set_password('Password123!')
    admin_user.is_active = True
    admin_user.is_verified = True
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.role = 'ADMIN'
    admin_user.save()
    print("Admin user found and updated: admin@justicehub.com / Password123!")
except User.DoesNotExist:
    # create it
    try:
        admin_user = User.objects.create_superuser(
            email='admin@justicehub.com',
            password='Password123!',
            first_name='Admin',
            last_name='User',
            phone_number='+11234567890'
        )
        admin_user.role = 'ADMIN'
        admin_user.is_active = True
        admin_user.is_verified = True
        admin_user.save()
        print("Admin user created: admin@justicehub.com / Password123!")
    except Exception as e:
        print(f"Error creating admin user: {e}")
