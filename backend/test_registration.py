import os
import django
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from accounts.utils import send_otp_email
import uuid

# create a dummy user
email = f"test_{uuid.uuid4().hex[:8]}@example.com"
random_phone = f"+2519{random.randint(10000000, 99999999)}"

user = User.objects.create(
    email=email,
    first_name="Test",
    last_name="User",
    phone_number=random_phone,
)

print(f"Testing OTP for user: {user.email}")
try:
    otp = send_otp_email(user, purpose="VERIFICATION")
    print(f"OTP Created: {otp.code}")
    print("Function send_otp_email finished successfully.")
except Exception as e:
    print(f"Error occurred: {e}")

# clean up
user.delete()
