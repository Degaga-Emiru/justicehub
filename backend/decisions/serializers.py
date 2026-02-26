from rest_framework import serializers
from django.utils import timezone
from .models import Decision, DecisionDelivery
from cases.serializers import CaseListSerializer
from accounts.serializers import UserProfileSerializer


class DecisionSerializer(serializers.ModelSerializer):
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)
    case_details = serializers.SerializerMethodField()
    judge = serializers.SerializerMethodField()
    
    class Meta:
        model = Decision
        fields = [
            'id', 'decision_number', 'case', 'case_details', 'judge', 'judge_name',
            'title', 'decision_type', 
            'introduction', 'background', 'analysis', 'conclusion', 'order',
            'laws_cited', 'cases_cited',
            'pdf_document', 'is_published', 'published_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'decision_number', 'is_published', 'judge',
            'published_at', 'created_at', 'updated_at'
        ]
    
    def get_case_details(self, obj):
        return {
            "id": obj.case.id,
            "file_number": obj.case.file_number,
            "title": obj.case.title
        }

    def get_judge(self, obj):
        return {
            "id": obj.judge.id,
            "full_name": obj.judge.get_full_name()
        }
    
    def validate(self, attrs):
        # Check if decision already exists for this case
        case = attrs.get('case')
        if case and Decision.objects.filter(case=case).exists():
            raise serializers.ValidationError("A decision already exists for this case.")
        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['judge'] = request.user
        return super().create(validated_data)


class DecisionDeliverySerializer(serializers.ModelSerializer):
    recipient = serializers.SerializerMethodField()
    
    class Meta:
        model = DecisionDelivery
        fields = [
            'id', 'recipient', 'method', 'delivered_at', 'acknowledged_at'
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