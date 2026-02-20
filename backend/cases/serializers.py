from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import (
    CaseCategory, Case, CaseDocument, 
    JudgeAssignment, CaseNotes
)
from accounts.models import User
from accounts.serializers import UserProfileSerializer
from notifications.services import create_notification
from .constants import CaseStatus

class CaseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseCategory
        fields = ['id', 'name', 'description', 'code', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CaseDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = CaseDocument
        fields = [
            'id', 'case', 'uploaded_by', 'uploaded_by_name',
            'file', 'file_name', 'file_size', 'file_type',
            'document_type', 'description', 'is_confidential',
            'checksum', 'uploaded_at'
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'file_name', 'file_size',
            'file_type', 'checksum', 'uploaded_at'
        ]

    def validate_file(self, value):
        if value.size > CaseDocument.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size cannot exceed {CaseDocument.MAX_FILE_SIZE // (1024*1024)}MB"
            )
        return value


class CaseCreateSerializer(serializers.ModelSerializer):
    documents = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )
    document_types = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Case
        fields = [
            'id', 'title', 'description', 'case_summary',
            'category', 'priority', 'plaintiff', 'defendant',
            'plaintiff_lawyer', 'defendant_lawyer',
            'documents', 'document_types'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        # Ensure at least one document is provided
        if not self.context.get('request').FILES:
            raise serializers.ValidationError(
                {"documents": "At least one document is required."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        documents = validated_data.pop('documents', [])
        document_types = validated_data.pop('document_types', [])
        request = self.context.get('request')
        
        # Create case
        case = Case.objects.create(
            **validated_data,
            created_by=request.user,
            status=CaseStatus.PENDING_REVIEW
        )
        
        # Save documents
        for i, file in enumerate(documents):
            doc_type = document_types[i] if i < len(document_types) else ''
            CaseDocument.objects.create(
                case=case,
                uploaded_by=request.user,
                file=file,
                document_type=doc_type
            )
        
        # Create notifications
        create_notification(
            user=request.user,
            type='CASE_SUBMITTED',
            title='Case Submitted Successfully',
            message=f"Your case '{case.title}' has been submitted and is pending review.",
            case=case
        )
        
        # Notify all registrars
        registrars = User.objects.filter(role='REGISTRAR')
        for registrar in registrars:
            create_notification(
                user=registrar,
                type='CASE_SUBMITTED',
                title='New Case Pending Review',
                message=f"New case '{case.title}' submitted by {request.user.get_full_name()}.",
                case=case,
                priority='HIGH'
            )
        
        return case


class CaseDetailSerializer(serializers.ModelSerializer):
    category = CaseCategorySerializer(read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    plaintiff = UserProfileSerializer(read_only=True)
    defendant = UserProfileSerializer(read_only=True)
    plaintiff_lawyer = UserProfileSerializer(read_only=True)
    defendant_lawyer = UserProfileSerializer(read_only=True)
    reviewed_by = UserProfileSerializer(read_only=True)
    documents = CaseDocumentSerializer(many=True, read_only=True)
    current_judge = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'title', 'description', 'case_summary',
            'category', 'status', 'priority',
            'file_number', 'court_name', 'court_room',
            'created_by', 'plaintiff', 'defendant',
            'plaintiff_lawyer', 'defendant_lawyer',
            'reviewed_by', 'reviewed_at', 'rejection_reason',
            'filing_date', 'closed_date', 'created_at', 'updated_at',
            'documents', 'current_judge'
        ]
        read_only_fields = [
            'id', 'file_number', 'filing_date',
            'created_at', 'updated_at', 'status'
        ]

    def get_current_judge(self, obj):
        assignment = obj.judge_assignments.filter(is_active=True).first()
        if assignment:
            return {
                'id': assignment.judge.id,
                'name': assignment.judge.get_full_name(),
                'assigned_at': assignment.assigned_at
            }
        return None


class CaseListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    client_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Case
        fields = [
            'id', 'title', 'file_number', 'category_name',
            'status', 'priority', 'client_name', 'created_at'
        ]


class CaseReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['accept', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    court_name = serializers.CharField(required=False, allow_blank=True)
    court_room = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['action'] == 'reject' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError(
                {"rejection_reason": "Rejection reason is required when rejecting a case."}
            )
        if attrs['action'] == 'accept' and not attrs.get('court_name'):
            raise serializers.ValidationError(
                {"court_name": "Court name is required when accepting a case."}
            )
        return attrs


class JudgeAssignmentSerializer(serializers.ModelSerializer):
    judge_details = UserProfileSerializer(source='judge', read_only=True)
    case_details = CaseListSerializer(source='case', read_only=True)
    
    class Meta:
        model = JudgeAssignment
        fields = [
            'id', 'case', 'case_details', 'judge', 'judge_details',
            'assigned_by', 'assigned_at', 'ended_at', 'is_active',
            'assignment_notes'
        ]
        read_only_fields = ['id', 'assigned_at', 'assigned_by']

    def validate(self, attrs):
        # Check if case already has active assignment
        case = attrs.get('case')
        if case and case.judge_assignments.filter(is_active=True).exists():
            raise serializers.ValidationError(
                "This case already has an active judge assignment."
            )
        return attrs


class CaseNotesSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = CaseNotes
        fields = ['id', 'case', 'author', 'author_name', 'title', 'content', 'is_private', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)