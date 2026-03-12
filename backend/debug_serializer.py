import os
import django
import sys

# Set up Django environment properly
sys.path.append('c:\\Users\\HP\\justicehub\\backend')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ['*']

from rest_framework.test import APIRequestFactory
from cases.models import Case, CaseDocument, CaseDocumentVersion
from cases.serializers import CaseDocumentSerializer
from accounts.models import User
import json

factory = APIRequestFactory()
request = factory.get('/', HTTP_HOST='localhost')
# DRF serializers expect 'request' in context for absolute URIs
context = {'request': request}

doc_id = '1d6ff457-5aeb-4a35-b479-b775608aea56'

print("--- Testing User's Document ---")
try:
    doc = CaseDocument.objects.get(id=doc_id)
    serializer = CaseDocumentSerializer(doc, context=context)
    print(f"Serializer Data for {doc_id}:")
    print(json.dumps(serializer.data, indent=2, default=str))
except CaseDocument.DoesNotExist:
    print(f"Document {doc_id} not found.")

print("\n--- Testing Document with Versions ---")
# Find a document with at least one version
v = CaseDocumentVersion.objects.first()
if v:
    doc = v.document
    print(f"Testing Doc {doc.id} which has {doc.versions.count()} versions")
    serializer = CaseDocumentSerializer(doc, context=context)
    print(json.dumps(serializer.data, indent=2, default=str))
else:
    print("No CaseDocumentVersion records found to test with.")

print("\n--- Creating Test Data ---")
try:
    user = User.objects.first()
    case = Case.objects.first()
    if user and case:
        test_doc = CaseDocument.objects.create(
            case=case,
            uploaded_by=user,
            document_type='EVIDENCE',
            description='Test Document'
        )
        for i in range(1, 3):
            CaseDocumentVersion.objects.create(
                document=test_doc,
                version_number=i,
                file='test_file.pdf',
                file_size=1024,
                file_name='test_file.pdf',
                file_type='pdf',
                checksum=f'dummy_{i}',
                uploaded_by=user,
                is_active=(i==2)
            )
        print(f"Created test doc {test_doc.id} with 2 versions.")
        serializer = CaseDocumentSerializer(test_doc, context=context)
        print(json.dumps(serializer.data, indent=2, default=str))
except Exception as e:
    print(f"Error: {e}")
