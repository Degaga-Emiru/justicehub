import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.get(email='admin@justicehub.com')
token = str(RefreshToken.for_user(user).access_token)
print(token)
