from rest_framework import serializers
from django.utils import timezone
from .models import Decision, DecisionDelivery, DecisionVersion, DecisionComment, DecisionAppeal
from cases.serializers import CaseListSerializer
from accounts.serializers import UserProfileSerializer
from cases.models import JudgeAssignment


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


class DecisionAppealSerializer(serializers.ModelSerializer):
    appellant_name = serializers.CharField(source='appellant.get_full_name', read_only=True)
    
    class Meta:
        model = DecisionAppeal
        fields = ['id', 'appellant', 'appellant_name', 'reasons', 'filed_at']
        read_only_fields = ['id', 'appellant', 'appellant_name', 'filed_at']


class DecisionSerializer(serializers.ModelSerializer):
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)
    case_details = serializers.SerializerMethodField()
    judge_details = serializers.SerializerMethodField()
    versions = DecisionVersionSerializer(many=True, read_only=True)
    comments = DecisionCommentSerializer(many=True, read_only=True)
    appeals = DecisionAppealSerializer(many=True, read_only=True)
    
    class Meta:
        model = Decision
        fields = [
            'id', 'decision_number', 'case', 'case_details', 'judge', 'judge_details', 'judge_name',
            'title', 'decision_type', 'status', 'version',
            'introduction', 'background', 'analysis', 'conclusion', 'order',
            'laws_cited', 'cases_cited',
            'document', 'pdf_document', 'is_published', 'published_at', 'finalized_at',
            'created_at', 'updated_at', 'versions', 'comments', 'appeals'
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
