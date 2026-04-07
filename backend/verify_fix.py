import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import requests
from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from cases.models import CaseCategory

user = User.objects.filter(role='CITIZEN', is_active=True).first()
if not user:
    print("No active citizen user found!")
    exit(1)

print(f"Using user: {user.email}")
token = str(RefreshToken.for_user(user).access_token)

cat = CaseCategory.objects.filter(is_active=True).first()
if not cat:
    print("No active category found!")
    exit(1)

print(f"Using category: {cat.name} ({cat.id})")

headers = {
    'Authorization': f'Bearer {token}'
}

# Test 1: multipart/form-data WITH file upload (this was failing before)
print("\n--- Test 1: Multipart with file upload ---")
data = {
    'title': 'Test After Parser Fix',
    'description': 'Testing multipart form data with file',
    'category': str(cat.id),
    'priority': 'MEDIUM',
    'defendant_name': 'Test Defendant',
    'document_types': ['PETITION']
}
files = {
    'documents': ('test_petition.pdf', b'%PDF-1.4 test content here', 'application/pdf')
}
res = requests.post('http://localhost:8000/api/cases/', data=data, files=files, headers=headers)
print(f"Status: {res.status_code}")
try:
    print(f"Response: {res.json()}")
except:
    print(f"Response text: {res.text[:500]}")

# Test 2: multipart/form-data WITHOUT file upload
print("\n--- Test 2: Multipart without file upload ---")
data2 = {
    'title': 'Test No File Upload',
    'description': 'Testing multipart without file',
    'category': str(cat.id),
    'priority': 'MEDIUM',
    'defendant_name': 'Another Defendant',
}
res2 = requests.post('http://localhost:8000/api/cases/', data=data2, headers=headers)
print(f"Status: {res2.status_code}")
try:
    print(f"Response: {res2.json()}")
except:
    print(f"Response text: {res2.text[:500]}")
