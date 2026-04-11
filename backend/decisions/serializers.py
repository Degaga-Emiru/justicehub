from rest_framework import serializers
from django.utils import timezone
from .models import Decision, DecisionDelivery, DecisionVersion, DecisionComment
from cases.serializers import CaseListSerializer
from accounts.serializers import UserProfileSerializer
from cases.models import JudgeAssignment
from hearings.models import Hearing


class DecisionVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = DecisionVersion
        fields = [
            'id', 'version', 'title', 'introduction', 'background', 
            'analysis', 'conclusion', 'order', 'created_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by_name']


class DecisionCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = DecisionComment
        fields = ['id', 'author', 'author_name', 'text', 'created_at']
        read_only_fields = ['id', 'author', 'author_name', 'created_at']




class DecisionSerializer(serializers.ModelSerializer):
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)
    case_details = serializers.SerializerMethodField()
    judge_details = serializers.SerializerMethodField()
    versions = DecisionVersionSerializer(many=True, read_only=True)
    comments = DecisionCommentSerializer(many=True, read_only=True)

    signature_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Decision
        fields = [
            'id', 'decision_number', 'case', 'case_details', 'judge', 'judge_details', 'judge_name',
            'title', 'decision_type', 'status', 'version',
            'introduction', 'background', 'analysis', 'conclusion', 'order',
            'immediate_reason', 'description', 'finalized',
            'laws_cited', 'cases_cited',
            'document', 'pdf_document', 'is_published', 'published_at', 'finalized_at',
            'created_at', 'updated_at', 'versions', 'comments', 'signature_details'
        ]
        read_only_fields = [
            'id', 'decision_number', 'status', 'version', 'judge',
            'pdf_document', 'is_published', 'published_at', 'finalized_at', 
            'created_at', 'updated_at'
        ]
    
    def get_case_details(self, obj):
        return {
            "id": obj.case.id,
            "file_number": obj.case.file_number,
            "title": obj.case.title,
            "status": obj.case.status
        }

    def get_judge_details(self, obj):
        return {
            "id": obj.judge.id,
            "full_name": obj.judge.get_full_name()
        }
    
    def get_signature_details(self, obj):
        if not obj.document or not obj.document.is_signed:
            return None
        
        doc = obj.document
        return {
            "is_signed": doc.is_signed,
            "signature_algorithm": doc.signature_algorithm,
            "signed_by": doc.signed_by.get_full_name() if doc.signed_by else None,
            "signed_at": doc.signed_at,
            "document_hash": doc.document_hash,
            "signature_verified": doc.signature_verified
        }
    
    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        case = attrs.get('case') if not self.instance else self.instance.case

        # Check if decision already exists for this case (only if creating)
        if not self.instance:
            if case and Decision.objects.filter(case=case).exists():
                raise serializers.ValidationError("A decision already exists for this case.")
        
        # Ensure judge is assigned to this case
        if user.role == 'JUDGE':
            is_assigned = JudgeAssignment.objects.filter(
                case=case,
                judge=user,
                is_active=True
            ).exists()
            if not is_assigned:
                raise serializers.ValidationError("You are not assigned as the active judge for this case.")
        
        # Validate based on decision type
        decision_type = attrs.get('decision_type') or (self.instance.decision_type if self.instance else None)
        
        if decision_type == Decision.DecisionType.IMMEDIATE:
            if not attrs.get('immediate_reason') and not (self.instance and self.instance.immediate_reason):
                raise serializers.ValidationError({"immediate_reason": "Reason is required for immediate decisions."})
            if not attrs.get('description') and not (self.instance and self.instance.description):
                raise serializers.ValidationError({"description": "Description is required for immediate decisions."})

        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['judge'] = request.user
        validated_data['status'] = Decision.DecisionStatus.DRAFT
        return super().create(validated_data)


class DecisionDeliverySerializer(serializers.ModelSerializer):
    recipient = serializers.SerializerMethodField()
    
    class Meta:
        model = DecisionDelivery
        fields = [
            'id', 'recipient', 'method', 'delivered_at', 'acknowledged_at',
            'delivery_address', 'tracking_number'
        ]
        read_only_fields = ['id', 'delivered_at', 'acknowledged_at']

    def get_recipient(self, obj):
        return {
            "id": obj.recipient.id,
            "full_name": obj.recipient.get_full_name(),
            "email": obj.recipient.email
        }


class DecisionPublishSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(required=True)
    
    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm to publish the decision.")
        return value


class DecisionDocumentUploadSerializer(serializers.Serializer):
    """Serializer for judge to upload decision document manually"""
    file = serializers.FileField(required=True)
    
    def validate_file(self, value):
        ext = value.name.split('.')[-1].lower()
        if ext not in ['pdf', 'docx']:
            raise serializers.ValidationError("Only PDF and DOCX files are allowed.")
        return value


class DecisionSignatureSerializer(serializers.Serializer):
    """Serializer for digital signature information"""
    case_id = serializers.UUIDField(source='case.id', read_only=True)
    decision_id = serializers.UUIDField(source='id', read_only=True)
    is_signed = serializers.BooleanField(source='document.is_signed', read_only=True)
    signature_algorithm = serializers.CharField(source='document.signature_algorithm', read_only=True)
    signed_by = serializers.CharField(source='document.signed_by.get_full_name', read_only=True)
    signed_at = serializers.DateTimeField(source='document.signed_at', read_only=True)
    document_hash = serializers.CharField(source='document.document_hash', read_only=True)
    signature_verified = serializers.BooleanField(source='document.signature_verified', read_only=True)


class ImmediateDecisionSerializer(serializers.Serializer):
    """Serializer for Immediate Decision feature"""
    reason = serializers.ChoiceField(choices=Decision.ImmediateReason.choices)
    description = serializers.CharField(style={'base_template': 'textarea.html'})

    def validate(self, attrs):
        case = self.context.get('case')
        if not case:
            raise serializers.ValidationError("Case context is missing.")
            
        # Check for conducted hearing
        conducted_hearing_exists = Hearing.objects.filter(
            case=case,
            status=Hearing.HearingStatus.CONDUCTED
        ).exists()
        
        if not conducted_hearing_exists:
            raise serializers.ValidationError("An immediate decision cannot be issued unless at least one hearing for the case has been conducted.")
            
        return attrs
