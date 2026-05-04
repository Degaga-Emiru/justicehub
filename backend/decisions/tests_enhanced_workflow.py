from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch
from decisions.models import Decision
from cases.models import Case, CaseCategory, JudgeAssignment, CaseDocument
import os

User = get_user_model()

class EnhancedDecisionWorkflowTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Judge
        import random
        phone = f"+2519{random.randint(10000000, 99999999)}"
        self.judge = User.objects.create_user(
            email='judge@example.com',
            password='password123',
            role='JUDGE',
            first_name='Test',
            last_name='Judge',
            phone_number=phone
        )
        
        # Create Category
        self.category, _ = CaseCategory.objects.get_or_create(name='Ultra Unique Civil', code='CIV-ULTRA-001')
        
        # Create Case
        self.case = Case.objects.create(
            title='Test Case',
            description='Description',
            category=self.category,
            created_by=self.judge,
            status=Case.StatusChoices.ASSIGNED,
            file_number='FILE-001'
        )
        
        # Register Judge Assignment
        JudgeAssignment.objects.create(
            case=self.case,
            judge=self.judge,
            assigned_by=self.judge,
            is_active=True
        )
        
        # Force authenticate
        self.client.force_authenticate(user=self.judge)

    def test_upload_document_workflow(self):
        """Test Workflow 2: Upload document then finalize"""
        # 1. Create Decision Draft
        decision = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Draft Decision',
            decision_type=Decision.DecisionType.FINAL,
            status=Decision.DecisionStatus.DRAFT
        )
        
        # 2. Upload Document
        pdf_content = b"%PDF-1.4 test content"
        uploaded_file = SimpleUploadedFile("test.pdf", pdf_content, content_type="application/pdf")
        
        response = self.client.post(
            f"/api/decisions/{decision.id}/upload-decision-document/",
            {'file': uploaded_file},
            format='multipart'
        )
        
        if response.status_code != status.HTTP_201_CREATED:
            print(f"FAILED: upload returned {response.status_code}: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        decision.refresh_from_db()
        self.assertIsNotNone(decision.document)
        self.assertEqual(decision.document.document_type, CaseDocument.DocumentType.JUDGMENT)
        
        # 3. Finalize
        # Patch deliver_decision to avoid email/notification side effects in test
        with patch('decisions.services.deliver_decision') as mock_deliver:
            response = self.client.post(f"/api/decisions/{decision.id}/finalize/", {})
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            decision.refresh_from_db()
            self.case.refresh_from_db()
            
            self.assertEqual(decision.status, Decision.DecisionStatus.FINALIZED)
            self.assertEqual(self.case.status, Case.StatusChoices.CLOSED)
            self.assertFalse(decision.pdf_document) # Should NOT have generated a new PDF
            mock_deliver.assert_called_once()

    def test_generated_pdf_workflow(self):
        """Test Workflow 1: Finalize without upload (generates PDF)"""
        # 1. Create Decision Draft
        decision = Decision.objects.create(
            case=self.case,
            judge=self.judge,
            title='Generated Decision',
            introduction='Intro',
            background='Background',
            analysis='Analysis',
            conclusion='Conclusion',
            order='Order',
            decision_type=Decision.DecisionType.FINAL,
            status=Decision.DecisionStatus.DRAFT
        )
        
        # 2. Finalize (should generate PDF)
        # Patch generate_decision_pdf to avoid weasyprint issues in CI if necessary, 
        # but let's try to run it for real since we installed dependencies.
        # Actually, let's patch it to return a dummy file to be safe.
        with patch('decisions.services.generate_decision_pdf') as mock_gen, \
             patch('decisions.services.deliver_decision') as mock_deliver:
            
            # Simulate PDF generation by setting the pdf_document field
            def side_effect(dec):
                dec.pdf_document.save('generated.pdf', SimpleUploadedFile('generated.pdf', b'fake pdf'))
                return True
            mock_gen.side_effect = side_effect
            
            response = self.client.post(f"/api/decisions/{decision.id}/finalize/", {})
            
            if response.status_code != status.HTTP_200_OK:
                print(f"FAILED: finalize returned {response.status_code}: {response.data}")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            decision.refresh_from_db()
            self.case.refresh_from_db()
            
            self.assertEqual(decision.status, Decision.DecisionStatus.FINALIZED)
            self.assertEqual(self.case.status, Case.StatusChoices.CLOSED)
            self.assertTrue(decision.pdf_document)
            self.assertIsNotNone(decision.document) # Should be linked to the generated PDF
            mock_deliver.assert_called_once()
            mock_gen.assert_called_once()
