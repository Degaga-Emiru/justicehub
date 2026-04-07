import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from cases.models import CaseCategory

user = User.objects.filter(role='CITIZEN').first()
token = str(RefreshToken.for_user(user).access_token)

headers = {
    'Authorization': f'Bearer {token}'
}

cat = CaseCategory.objects.first()

data = {
    'title': 'Test Case Def Valid',
    'description': 'valid string',
    'category': cat.id,
    'priority': 'MEDIUM',
    'defendant_name': 'Evil Corp',
    'document_types': ['PETITION']
}
files = {
    'documents': ('test.pdf', b'dummy content here', 'application/pdf')
}

res = requests.post('http://127.0.0.1:8000/api/cases/', data=data, files=files, headers=headers)
print("Status:", res.status_code)
print("Response JSON:", res.json())
