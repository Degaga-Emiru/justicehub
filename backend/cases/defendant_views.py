from rest_framework import viewsets, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from .models import Case, CaseDocument, CaseDocumentVersion, CaseActionRequest
from .serializers import (
    DefendantCaseListSerializer, 
    DefendantCaseDetailSerializer,
    DefendantResponseUploadSerializer,
    CaseDocumentSerializer,
    CaseActionRequestSerializer
)
from .permissions import IsDefendantOfCase
from decisions.models import Decision, DecisionDelivery
from decisions.serializers import DecisionSerializer
from notifications.services import create_notification

class DefendantCaseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for defendants to access their cases and related data.
    """
    permission_classes = [permissions.IsAuthenticated, IsDefendantOfCase]
    
    def get_queryset(self):
        return Case.objects.filter(defendant=self.user)

    @property
    def user(self):
        return self.request.user

    def get_serializer_class(self):
        if self.action == 'list':
            return DefendantCaseListSerializer
        return DefendantCaseDetailSerializer

    @action(detail=True, methods=['get'])
    def evidence(self, request, pk=None):
        """Return all evidence submitted by the plaintiff"""
        case = self.get_object()
        # Plaintiff evidence = uploaded by plaintiff or their lawyer
        # We include more types because users might tag them differently
        # and we exclude the defendant's own uploads
        evidence = case.documents.filter(
            Q(document_type='EVIDENCE') | 
            Q(uploaded_by=case.plaintiff) | 
            Q(uploaded_by=case.plaintiff_lawyer)
        ).exclude(uploaded_by=request.user).distinct()
        
        serializer = CaseDocumentSerializer(evidence, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """
        Return all case-related documents:
        court documents, legal filings, reports, judgments
        """
        case = self.get_object()
        # General documents = everything that is NOT classified as EVIDENCE and NOT by the current user
        # or explicitly tagged as court docs.
        # We also filter out confidential docs unless the user has permission (handled by serializer usually, but good to filter here too)
        docs = case.documents.filter(
            Q(document_type__in=['ORDER', 'JUDGMENT', 'PETITION', 'AFFIDAVIT', 'OTHER']) |
            Q(uploaded_by__role__in=['JUDGE', 'REGISTRAR', 'CLERK'])
        ).exclude(uploaded_by=request.user).distinct()
        
        serializer = CaseDocumentSerializer(docs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='submit-response', parser_classes=[MultiPartParser, FormParser])
    @transaction.atomic
    def submit_response(self, request, pk=None):
        """Submit a defense statement or evidence"""
        case = self.get_object()
        serializer = DefendantResponseUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            file = serializer.validated_data['file']
            doc_type = serializer.validated_data['document_type']
            description = serializer.validated_data.get('description', '')
            
            # Create CaseDocument
            document = CaseDocument.objects.create(
                case=case,
                uploaded_by=request.user,
                document_type=doc_type,
                description=description
            )
            
            # Create Version
            CaseDocumentVersion.objects.create(
                document=document,
                file=file,
                uploaded_by=request.user,
                version_number=1,
                is_active=True,
                status='PENDING'
            )
            
            # Notify Plaintiff & Judge (if assigned)
            from notifications.services import notify_case_participants
            notify_case_participants(
                case=case,
                type='DEFENSE_RESPONSE_SUBMITTED',
                title=f'Defense {doc_type.replace("_", " ").title()} Submitted',
                message=f'The defendant has submitted a new {doc_type.replace("_", " ").lower()} for case {case.file_number}.',
                exclude_users=[request.user]
            )
            
            return Response({
                "message": f"Defendant {doc_type.replace('_', ' ').lower()} submitted successfully.",
                "document_id": document.id
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def decision(self, request, pk=None):
        """View final judgment/decision"""
        case = self.get_object()
        decision = Decision.objects.filter(case=case, status='PUBLISHED').first()
        
        if not decision:
            return Response({"error": "No published decision found for this case."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = DecisionSerializer(decision, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='acknowledge-decision')
    def acknowledge_decision(self, request, pk=None):
        """Acknowledge receipt of a decision"""
        case = self.get_object()
        decision = get_object_or_404(Decision, case=case, status='PUBLISHED')
        
        delivery, created = DecisionDelivery.objects.get_or_create(
            decision=decision,
            recipient=request.user,
            defaults={'method': 'PORTAL'}
        )
        
        from django.utils import timezone
        delivery.acknowledged_at = timezone.now()
        delivery.save()
        
        return Response({"message": "Decision acknowledged successfully."})

    @action(detail=True, methods=['post'], url_path='acknowledge-service')
    def acknowledge_service(self, request, pk=None):
        """Acknowledge receipt of the case (Service of Process)"""
        case = self.get_object()
        from django.utils import timezone
        case.is_defendant_acknowledged = True
        case.acknowledged_at = timezone.now()
        case.save()
        
        # Log action
        from audit_logs.services import create_audit_log
        from audit_logs.models import AuditLog
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.CASE_UPDATED,
            obj=case,
            description=f"Defendant {request.user.get_full_name()} acknowledged receipt of case {case.file_number}",
            entity_name=case.file_number
        )
        
        return Response({"message": "Case receipt acknowledged successfully."})

    @action(detail=True, methods=['get'])
    def actions(self, request, pk=None):
        """List all requested actions for this case"""
        case = self.get_object()
        actions = CaseActionRequest.objects.filter(case=case)
        serializer = CaseActionRequestSerializer(actions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='respond-to-action/(?P<action_id>[^/.]+)')
    def respond_to_action(self, request, pk=None, action_id=None):
        """Respond to a requested action"""
        action_request = get_object_or_404(CaseActionRequest, id=action_id, case__id=pk)
        response_text = request.data.get('response_text')
        
        if not response_text:
            return Response({"error": "response_text is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.utils import timezone
        action_request.response_text = response_text
        action_request.response_at = timezone.now()
        action_request.status = 'COMPLETED'
        action_request.save()
        
        return Response({"message": "Response submitted successfully."})
