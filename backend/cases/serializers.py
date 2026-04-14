from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import (
    CaseCategory, Case, CaseDocument, CaseDocumentVersion,
    JudgeAssignment, CaseNotes, JudgeProfile,
    CaseStatus, CaseActionRequest
)
from accounts.models import User
from accounts.serializers import UserProfileSerializer
from notifications.services import create_notification


class CaseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseCategory
        fields = ['id', 'name', 'description', 'code', 'fee', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CaseStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseStatus
        fields = ['id', 'name']


class CaseDocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    size_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CaseDocumentVersion
        fields = [
            'id', 'document', 'version_number', 'file', 'file_url', 
            'file_name', 'file_size', 'size_display', 'file_type', 
            'checksum', 'change_description', 'is_active', 'status', 
            'status_display', 'review_notes', 'uploaded_by', 
            'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = [
            'id', 'version_number', 'file_name', 'file_size', 
            'file_type', 'checksum', 'uploaded_at', 'uploaded_by',
            'is_active', 'status'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_size_display(self, obj):
        if obj.file_size < 1024:
            return f"{obj.file_size} B"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        else:
            return f"{obj.file_size / (1024 * 1024):.1f} MB"


class CaseDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for CaseDocument to return all versions.
    """
    document_id = serializers.UUIDField(source='id', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    versions = serializers.SerializerMethodField()
    
    # Fields for initial upload
    file = serializers.FileField(write_only=True, required=False)
    
    class Meta:
        model = CaseDocument
        fields = [
            'document_id', 'document_type', 'document_type_display', 
            'description', 'is_confidential', 'uploaded_by', 'versions', 'file'
        ]
        read_only_fields = ['document_id', 'document_type_display', 'versions', 'uploaded_by']

    def get_versions(self, obj):
        # Retrieve all document versions as requested
        versions = obj.versions.all()
        return CaseDocumentVersionSerializer(versions, many=True, context=self.context).data

    def validate_file(self, value):
        from .models import CaseDocumentVersion
        if value.size > CaseDocumentVersion.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size cannot exceed {CaseDocumentVersion.MAX_FILE_SIZE // (1024 * 1024)}MB"
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        from .models import CaseDocumentVersion
        file = validated_data.pop('file', None)
        request = self.context.get('request')
        
        document = CaseDocument.objects.create(
            **validated_data,
            uploaded_by=request.user
        )
        
        if file:
            CaseDocumentVersion.objects.create(
                document=document,
                file=file,
                uploaded_by=request.user,
                version_number=1,
                is_active=True,
                status='APPROVED' if request.user.role in ['JUDGE', 'REGISTRAR'] else 'PENDING'
            )
        
        return document


class JudgeProfileSerializer(serializers.ModelSerializer):
    """Judge Profile Serializer - This was missing"""
    user_details = UserProfileSerializer(source='user', read_only=True)
    specialization_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    specializations = CaseCategorySerializer(many=True, read_only=True)
    active_cases_count = serializers.SerializerMethodField()
    can_take_more = serializers.SerializerMethodField()
    
    class Meta:
        model = JudgeProfile
        fields = [
            'id', 'user', 'user_details', 'specializations', 'specialization_ids',
            'max_active_cases', 'active_cases_count', 'can_take_more',
            'bar_certificate_number', 'years_of_experience', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'active_cases_count', 'can_take_more']

    def get_active_cases_count(self, obj):
        return obj.get_active_case_count()

    def get_can_take_more(self, obj):
        return obj.can_take_more_cases()

    def create(self, validated_data):
        specialization_ids = validated_data.pop('specialization_ids', [])
        user = validated_data.get('user')
        
        # Check if user is a judge
        if user.role != 'JUDGE':
            raise serializers.ValidationError({"user": "User must have role JUDGE."})
        
        # Check if profile already exists
        if JudgeProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError({"user": "Judge profile already exists for this user."})
        
        profile = JudgeProfile.objects.create(**validated_data)
        if specialization_ids:
            profile.specializations.set(specialization_ids)
        return profile

    def update(self, instance, validated_data):
        specialization_ids = validated_data.pop('specialization_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if specialization_ids is not None:
            instance.specializations.set(specialization_ids)
        
        return instance


class JudgeAssignmentSerializer(serializers.ModelSerializer):
    judge_details = UserProfileSerializer(source='judge', read_only=True)
    case_details = serializers.SerializerMethodField()
    assigned_by_details = UserProfileSerializer(source='assigned_by', read_only=True)
    
    class Meta:
        model = JudgeAssignment
        fields = [
            'id', 'case', 'case_details', 'judge', 'judge_details',
            'assigned_by', 'assigned_by_details', 'assigned_at', 'ended_at',
            'is_active', 'assignment_notes'
        ]
        read_only_fields = ['id', 'assigned_at', 'assigned_by']

    def get_case_details(self, obj):
        from .serializers import CaseListSerializer
        return CaseListSerializer(obj.case).data

    def validate(self, attrs):
        case = attrs.get('case')
        judge = attrs.get('judge')
        
        # Check if case already has active assignment
        if case and case.judge_assignments.filter(is_active=True).exists():
            raise serializers.ValidationError("This case already has an active judge assignment.")
        
        # Check judge's active case limit
        if judge and attrs.get('is_active', True):
            judge_profile = JudgeProfile.objects.filter(user=judge).first()
            if judge_profile:
                active_count = JudgeAssignment.objects.filter(
                    judge=judge,
                    is_active=True
                ).count()
                if active_count >= judge_profile.max_active_cases:
                    raise serializers.ValidationError("Judge has reached maximum active cases limit.")
        
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


class CaseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for case lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    category_fee = serializers.DecimalField(source='category.fee', max_digits=10, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    client_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    client_email = serializers.CharField(source='created_by.email', read_only=True)
    assigned_judge = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'title', 'description', 'file_number', 'category_name', 'category_code', 'category_fee',
            'status', 'status_display', 'priority', 'priority_display',
            'client_name', 'client_email', 'assigned_judge', 'created_at', 'defendant_name',
            'defendant_address', 'rejection_reason'
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.defendant is None:
            representation['defendant'] = "PENDING_DEFENDANT"
        return representation

    def get_assigned_judge(self, obj):
        assignment = obj.judge_assignments.filter(is_active=True).first()
        if assignment:
            return {
                'id': assignment.judge.id,
                'name': assignment.judge.get_full_name()
            }
        return None


class CaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new cases"""
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
    # Optional free-text defendant info (used when defendant is not a registered user yet)
    defendant_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    defendant_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Case
        fields = [
            'id', 'title', 'description', 'case_summary',
            'category', 'priority', 'plaintiff', 'defendant', 'defendant_name',
            'defendant_address', 'plaintiff_lawyer', 'defendant_lawyer',
            'documents', 'document_types'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        request = self.context.get('request')

        # For citizens, auto-assign themselves as plaintiff
        if request.user.role == 'CITIZEN':
            attrs['plaintiff'] = request.user

        plaintiff = attrs.get('plaintiff')
        defendant = attrs.get('defendant')
        defendant_name = attrs.get('defendant_name', '')

        if not plaintiff:
            raise serializers.ValidationError("A case must have a Plaintiff.")

        # Defendant must be provided as either a User FK or a name/address
        if not defendant and not defendant_name:
            raise serializers.ValidationError(
                "A case must have a Defendant (either a registered user or a defendant name)."
            )

        if defendant and plaintiff == defendant:
            raise serializers.ValidationError(
                "A person cannot be both Plaintiff and Defendant in the same case."
            )

        return attrs

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.defendant is None:
            representation['defendant'] = "PENDING_DEFENDANT"
        return representation

    @transaction.atomic
    def create(self, validated_data):
        documents = validated_data.pop('documents', [])
        document_types = validated_data.pop('document_types', [])
        request = self.context.get('request')
        
        # Create case
        case = Case.objects.create(
            **validated_data,
            created_by=request.user
        )
        
        # Save documents if provided
        for i, file in enumerate(documents):
            doc_type = document_types[i] if i < len(document_types) else 'OTHER'
            document = CaseDocument.objects.create(
                case=case,
                uploaded_by=request.user,
                document_type=doc_type
            )
            CaseDocumentVersion.objects.create(
                document=document,
                file=file,
                version_number=1,
                uploaded_by=request.user,
                is_active=True,
                status='APPROVED' if request.user.role in ['JUDGE', 'REGISTRAR'] else 'PENDING'
            )
        
        # Trigger registrar notification
        from .services import CaseNotificationService, AuditService
        CaseNotificationService.notify_registrars_new_case(case)
        
        # Log action
        AuditService.log_action(
            user=request.user,
            action='CASE_CREATED',
            entity=case,
            details={'title': case.title, 'category': case.category.name}
        )
        
        return case


class CaseDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single case view"""
    case_number = serializers.CharField(source='file_number', read_only=True)
    category = CaseCategorySerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    plaintiff = UserProfileSerializer(read_only=True)
    defendant = UserProfileSerializer(read_only=True)
    plaintiff_lawyer = UserProfileSerializer(read_only=True)
    defendant_lawyer = UserProfileSerializer(read_only=True)
    reviewed_by = UserProfileSerializer(read_only=True)
    documents = CaseDocumentSerializer(many=True, read_only=True)
    current_assignment = serializers.SerializerMethodField()
    document_count = serializers.IntegerField(source='documents.count', read_only=True)
    days_pending = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'description', 'case_summary',
            'category', 'status', 'status_display', 'priority', 'priority_display',
            'file_number', 'court_name', 'court_room',
            'created_by', 'plaintiff', 'defendant', 'defendant_name', 'defendant_address',
            'plaintiff_lawyer', 'defendant_lawyer',
            'reviewed_by', 'reviewed_at', 'rejection_reason',
            'filing_date', 'closed_date', 'created_at', 'updated_at',
            'documents', 'document_count', 'current_assignment', 'days_pending'
        ]
        read_only_fields = [
            'id', 'file_number', 'filing_date',
            'created_at', 'updated_at', 'status'
        ]

    def get_current_assignment(self, obj):
        assignment = obj.judge_assignments.filter(is_active=True).first()
        if assignment:
            return {
                'id': assignment.id,
                'judge_id': assignment.judge.id,
                'judge_name': assignment.judge.get_full_name(),
                'assigned_at': assignment.assigned_at,
                'assigned_by': assignment.assigned_by.get_full_name() if assignment.assigned_by else None
            }
        return None

    def get_days_pending(self, obj):
        if obj.closed_date:
            return (obj.closed_date - obj.filing_date).days
        return (timezone.now() - obj.filing_date).days

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.defendant is None:
            representation['defendant'] = "PENDING_DEFENDANT"
        return representation


class DefendantCaseListSerializer(CaseListSerializer):
    """Serializer for defendant case list view"""
    class Meta(CaseListSerializer.Meta):
        fields = CaseListSerializer.Meta.fields + ['is_defendant_acknowledged', 'acknowledged_at']


class DefendantCaseDetailSerializer(CaseDetailSerializer):
    """Serializer for defendant case detail view"""
    class Meta(CaseDetailSerializer.Meta):
        fields = CaseDetailSerializer.Meta.fields + ['is_defendant_acknowledged', 'acknowledged_at']


class DefendantResponseUploadSerializer(serializers.Serializer):
    """Serializer for uploading defendant response"""
    description = serializers.CharField(required=True)
    file = serializers.FileField(required=True)
    document_type = serializers.ChoiceField(
        choices=['EVIDENCE', 'AFFIDAVIT', 'OTHER'],
        default='EVIDENCE'
    )

    def validate_file(self, value):
        from .models import CaseDocumentVersion
        if value.size > CaseDocumentVersion.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size cannot exceed {CaseDocumentVersion.MAX_FILE_SIZE // (1024 * 1024)}MB"
            )
        return value


class CaseReviewSerializer(serializers.Serializer):
    """Serializer for case review (accept/reject)"""
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


class DefendantAccountCreateSerializer(serializers.Serializer):
    """Serializer for registrar to create/link defendant account"""
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class CaseBulkAssignSerializer(serializers.Serializer):
    """Serializer for bulk judge assignment"""
    case_ids = serializers.ListField(child=serializers.UUIDField())
    judge_id = serializers.UUIDField()
    assignment_notes = serializers.CharField(required=False, allow_blank=True)

    def validate_case_ids(self, value):
        if len(value) == 0:
            raise serializers.ValidationError("At least one case ID is required.")
        return value

    def validate_judge_id(self, value):
        try:
            judge = User.objects.get(id=value, role='JUDGE')
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Judge not found.")


class CaseStatusUpdateSerializer(serializers.Serializer):
    """Serializer for bulk status update"""
    case_ids = serializers.ListField(child=serializers.UUIDField())
    status = serializers.ChoiceField(choices=[
        'ACCEPTED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED'
    ])
    reason = serializers.CharField(required=False, allow_blank=True)

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_cases = serializers.IntegerField()
    pending_review = serializers.IntegerField()
    active_cases = serializers.IntegerField()
    closed_cases = serializers.IntegerField()
    total_judges = serializers.IntegerField()
    total_lawyers = serializers.IntegerField()
    upcoming_hearings = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()


class JudgeWorkloadSerializer(serializers.Serializer):
    """Serializer for judge workload analysis"""
    judge_id = serializers.UUIDField()
    judge_name = serializers.CharField()
    email = serializers.EmailField()
    specializations = serializers.ListField(child=serializers.CharField())
    active_cases = serializers.IntegerField()
    max_cases = serializers.IntegerField()
    available_slots = serializers.IntegerField()
    utilization_percentage = serializers.FloatField()


class JudgeDashboardSerializer(serializers.Serializer):
    """Serializer for judge dashboard data"""
    assigned_cases = serializers.IntegerField()
    pending_cases = serializers.IntegerField()
    closed_cases = serializers.IntegerField()
    upcoming_hearings = serializers.IntegerField()


class JudgeCaseSerializer(serializers.ModelSerializer):
    """Serializer for judge-specific case list/detail — includes documents and party info"""
    category = CaseCategorySerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    plaintiff_name = serializers.SerializerMethodField()
    documents = CaseDocumentSerializer(many=True, read_only=True)
    document_count = serializers.IntegerField(source='documents.count', read_only=True)
    
    class Meta:
        model = Case
        fields = [
            'id', 'title', 'file_number', 'description',
            'category', 'category_name',
            'status', 'status_display', 'priority', 'priority_display',
            'court_name', 'court_room', 'filing_date',
            'created_by_name', 'plaintiff_name', 'defendant_name',
            'documents', 'document_count',
            'created_at', 'updated_at'
        ]

    def get_plaintiff_name(self, obj):
        if obj.plaintiff:
            return obj.plaintiff.get_full_name()
        return obj.created_by.get_full_name() if obj.created_by else None

class CaseActionRequestSerializer(serializers.ModelSerializer):
    """Serializer for CaseActionRequest"""
    requester_name = serializers.CharField(source='requester.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CaseActionRequest
        fields = [
            'id', 'case', 'requester', 'requester_name', 
            'action_description', 'due_date', 'status', 
            'status_display', 'response_text', 'response_at', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'requester', 'created_at', 'updated_at', 'response_at']
