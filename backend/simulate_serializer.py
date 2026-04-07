import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from cases.serializers import CaseCreateSerializer
from cases.models import CaseCategory
from accounts.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

class DummyRequest:
    def __init__(self, user):
        self.user = user

user = User.objects.filter(role='CITIZEN').first()
if not user:
    user = User.objects.create(email="testcitizen_new@example.com", first_name="Test", last_name="User", role='CITIZEN', phone_number="+001234567890", is_active=True)

cat = CaseCategory.objects.first()
if not cat:
    cat = CaseCategory.objects.create(name="Test Category", code="TC-1", fee=100)

data = {
    'title': 'Test Multipart Case',
    'description': 'Description here',
    'category': cat.id,
    'priority': 'MEDIUM',
    'defendant_name': 'Evil Corp',
    'documents': [
        SimpleUploadedFile("petition.pdf", b"file_content_here", content_type="application/pdf")
    ],
    'document_types': ['PETITION']
}

request = DummyRequest(user)
serializer = CaseCreateSerializer(data=data, context={'request': request})
if serializer.is_valid():
    try:
        case = serializer.save()
        print("Success! Case ID:", case.id)
    except Exception as e:
        import traceback
        print("Error during save:")
        traceback.print_exc()
else:
    print("Validation errors:", serializer.errors)
