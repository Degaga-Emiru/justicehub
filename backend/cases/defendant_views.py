from rest_framework import viewsets, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import Case, CaseDocument, CaseDocumentVersion, CaseActionRequest, CaseCategory
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
from notifications.services import create_notification, notify_case_participants

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
        
        # We include:
        # 1. Documents where the defendant is the author
        # 2. Non-confidential documents from others
        # 3. Decision documents if published
        
        docs = case.documents.filter(
            Q(uploaded_by=request.user) |
            Q(is_confidential=False)
        ).distinct()
        
        data = CaseDocumentSerializer(docs, many=True, context={'request': request}).data
        
        # Add published decision if it exists
        decision = Decision.objects.filter(case=case, status='PUBLISHED').first()
        if decision:
            # We wrap decision in a similar format as CaseDocument for the frontend
            # or the frontend can handle it separately.
            # Let's add it to the list as a special type.
            decision_data = {
                'document_id': f"decision-{decision.id}",
                'document_type': 'JUDGMENT',
                'document_type_display': 'Final Judgment',
                'description': f"Final Decision: {decision.title}",
                'uploaded_by_name': decision.judge.get_full_name(),
                'uploaded_by_role': 'JUDGE',
                'created_at': decision.published_at or decision.created_at,
                'latest_version': {
                    'file_url': request.build_absolute_uri(decision.file.url) if decision.file else None,
                    'uploaded_at': decision.published_at or decision.created_at,
                    'status': 'APPROVED'
                }
            }
            data.append(decision_data)
            
        return Response(data)

    @action(detail=True, methods=['post'], url_path='submit-response', parser_classes=[MultiPartParser, FormParser, JSONParser])
    @transaction.atomic
    def submit_response(self, request, pk=None):
        """Submit a defense statement or evidence"""
        case = self.get_object()
        serializer = DefendantResponseUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            file = serializer.validated_data.get('file')
            doc_type = serializer.validated_data.get('document_type', 'EVIDENCE')
            description = serializer.validated_data.get('description', '')
            
            # Create CaseDocument
            document = CaseDocument.objects.create(
                case=case,
                uploaded_by=request.user,
                document_type=doc_type,
                description=description
            )
            
            # Create Version only if file is provided
            if file:
                CaseDocumentVersion.objects.create(
                    document=document,
                    file=file,
                    uploaded_by=request.user,
                    version_number=1,
                    is_active=True,
                    status='PENDING'
                )
            
            # Update Case Status
            case.has_defendant_responded = True
            case.responded_at = timezone.now()
            case.save()

            # Notify Plaintiff & Judge (if assigned)
            notify_case_participants(
                case=case,
                type='DEFENSE_RESPONSE_SUBMITTED',
                title=f'Defense {doc_type.replace("_", " ").title()} Submitted',
                message=f'The defendant has submitted a new {doc_type.replace("_", " ").lower()} for case {case.file_number}.',
                exclude_users=[request.user]
            )
            
            return Response({
                "message": f"Defendant {doc_type.replace('_', ' ').lower()} submitted successfully.",
                "document_id": document.id,
                "has_file": bool(file)
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

    @action(detail=True, methods=['post'], url_path='acknowledge-decision')
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
