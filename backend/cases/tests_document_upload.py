from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import CaseCategory, Case, CaseDocument, CaseDocumentVersion

User = get_user_model()

class DocumentUploadTests(APITestCase):
    """Test Case Document Upload actions"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.citizen = User.objects.create_user(
            email='citizen_upload@example.com',
            password='citizen123',
            first_name='Citizen',
            last_name='User',
            role='CITIZEN',
            phone_number='+2222222223'
        )
        
        # Create category
        self.category = CaseCategory.objects.create(
            name='Civil Upload',
            code='CIV-UPLOAD',
            description='Test Description'
        )
        
        # Create test case
        self.case = Case.objects.create(
            title='Test Upload Case',
            description='Test Description',
            category=self.category,
            created_by=self.citizen
        )
        
        self.client.force_authenticate(user=self.citizen)

    def test_add_document_success(self):
        """Test add_document action success"""
        url = f'/api/cases/{self.case.id}/add_document/'
        
        # Create a dummy file
        file_content = b'test file content'
        dummy_file = SimpleUploadedFile('test_doc.pdf', file_content, content_type='application/pdf')
        
        data = {
            'file': dummy_file,
            'document_type': 'EVIDENCE',
            'description': 'Test evidence description',
            'is_confidential': 'false'
        }
        
        response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CaseDocument.objects.filter(case=self.case).count(), 1)
        
        document = CaseDocument.objects.get(case=self.case)
        self.assertEqual(document.document_type, 'EVIDENCE')
        self.assertEqual(document.description, 'Test evidence description')
        
        # Check if version was created
        self.assertEqual(document.versions.count(), 1)
        version = document.versions.first()
        self.assertEqual(version.file_name, 'test_doc.pdf')
        self.assertEqual(version.status, 'PENDING') # Citizen upload should be PENDING

    def test_upload_multiple_documents_success(self):
        """Test upload_multiple_documents action success"""
        url = f'/api/cases/{self.case.id}/upload_multiple_documents/'
        
        file1 = SimpleUploadedFile('doc1.pdf', b'content 1', content_type='application/pdf')
        file2 = SimpleUploadedFile('doc2.pdf', b'content 2', content_type='application/pdf')
        
        data = {
            'documents': [file1, file2],
            'document_types': ['PETITION', 'EVIDENCE'],
            'descriptions': ['Petition desc', 'Evidence desc'],
            'is_confidential': 'true'
        }
        
        # MultiValueDict handle lists in multipart data
        response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CaseDocument.objects.filter(case=self.case).count(), 2)
        
        # Verify first document
        doc1 = CaseDocument.objects.get(case=self.case, document_type='PETITION')
        self.assertEqual(doc1.description, 'Petition desc')
        self.assertTrue(doc1.is_confidential)
        self.assertEqual(doc1.versions.first().file_name, 'doc1.pdf')
        
        # Verify second document
        doc2 = CaseDocument.objects.get(case=self.case, document_type='EVIDENCE')
        self.assertEqual(doc2.description, 'Evidence desc')
        self.assertTrue(doc2.is_confidential)
        self.assertEqual(doc2.versions.first().file_name, 'doc2.pdf')
