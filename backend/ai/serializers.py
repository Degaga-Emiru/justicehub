from rest_framework import serializers
from .models import ChatSession, ChatMessage, AIReportJob

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at', 'metadata']

class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'status', 'created_at', 'updated_at', 'last_message_at', 'messages']

class CreateChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'context']
        read_only_fields = ['id']

class CreateChatMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000)

class AIReportJobSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    
    class Meta:
        model = AIReportJob
        fields = [
            'id', 'requested_by', 'requested_by_name', 'type', 
            'status', 'filters', 'result', 'error_message', 
            'started_at', 'completed_at'
        ]
        read_only_fields = ['requested_by', 'status', 'result', 'error_message', 'completed_at']

class CreateReportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIReportJob
        fields = ['type', 'filters']
