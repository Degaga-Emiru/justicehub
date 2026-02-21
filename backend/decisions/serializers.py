from rest_framework import serializers
from django.utils import timezone
from .models import Decision, DecisionDelivery
from cases.serializers import CaseListSerializer
from accounts.serializers import UserProfileSerializer


class DecisionSerializer(serializers.ModelSerializer):
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True)
    case_details = CaseListSerializer(source='case', read_only=True)
    
    class Meta:
        model = Decision
        fields = [
            'id', 'case', 'case_details', 'judge', 'judge_name',
            'title', 'decision_type', 'decision_number',
            'introduction', 'background', 'analysis', 'conclusion', 'order',
            'laws_cited', 'cases_cited',
            'pdf_document', 'is_published', 'published_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'decision_number', 'is_published',
            'published_at', 'created_at', 'updated_at'
        ]
    
    def validate(self, attrs):
        # Check if decision already exists for this case
        case = attrs.get('case')
        if case and Decision.objects.filter(case=case).exists():
            raise serializers.ValidationError("A decision already exists for this case.")
        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['judge'] = request.user
        return super().create(validatedata)


class DecisionDeliverySerializer(serializers.ModelSerializer):
    recipient_details = UserProfileSerializer(source='recipient', read_only=True)
    
    class Meta:
        model = DecisionDelivery
        fields = [
            'id', 'decision', 'recipient', 'recipient_details',
            'method', 'delivered_at', 'acknowledged_at',
            'delivery_address', 'tracking_number'
        ]
        read_only_fields = ['id', 'delivered_at', 'acknowledged_at']


class DecisionPublishSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(required=True)
    
    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm to publish the decision.")
        return value