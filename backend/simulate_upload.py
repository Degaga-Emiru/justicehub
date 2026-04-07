import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from cases.models import CaseCategory
from django.urls import reverse

user = User.objects.filter(role='CITIZEN').first()
if not user:
    user = User.objects.create(email="testcitizen@example.com", first_name="Test", last_name="User", role='CITIZEN', phone_number="+1234567890", is_active=True)

cat = CaseCategory.objects.first()
if not cat:
    cat = CaseCategory.objects.create(name="Test Category", code="TC-1", fee=100)

from django.conf import settings
settings.ALLOWED_HOSTS.append('testserver')
client = APIClient()
client.force_authenticate(user=user)

data = {
    'title': 'Test Multipart Case',
    'description': 'Description here',
    'category': cat.id,
    'priority': 'MEDIUM',
    'defendant_name': 'Evil Corp'
}

print("Posting multipart data...")
res = client.post('/api/cases/', data, format='multipart', HTTP_HOST='127.0.0.1')

print("Status:", res.status_code)
try:
    print("Response JSON:", res.json())
except:
    print("Response HTML:", res.content)
