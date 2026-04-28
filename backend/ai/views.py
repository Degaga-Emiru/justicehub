from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChatSession, ChatMessage, AIReportJob
from .serializers import (
    ChatSessionSerializer, CreateChatSessionSerializer,
    ChatMessageSerializer, CreateChatMessageSerializer,
    AIReportJobSerializer, CreateReportJobSerializer
)
from .services import process_chat_message, run_report_job, process_public_chat_message
import threading
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

class ChatSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'id'
    lookup_value_regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return ChatSession.objects.all()
        return ChatSession.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CreateChatSessionSerializer
        return ChatSessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def messages(self, request, id=None):
        print(f"DEBUG: messages action called for id={id}, user={request.user}")
        try:
            session = self.get_object()
            print(f"DEBUG: Found session {session.id}")
        except Exception as e:
            print(f"DEBUG: get_object failed: {str(e)}")
            raise e
        
        serializer = CreateChatMessageSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                assistant_msg = process_chat_message(
                    session.id, 
                    request.user, 
                    serializer.validated_data['message']
                )
                return Response(
                    ChatMessageSerializer(assistant_msg).data, 
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AIReportJobViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admins can see all, others see only theirs
        if self.request.user.role == 'ADMIN':
            return AIReportJob.objects.all()
        return AIReportJob.objects.filter(requested_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReportJobSerializer
        return AIReportJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check permissions for specific roles if needed
        # (Already handled by permission_classes mostly, but can add custom logic)
        
        job = serializer.save(requested_by=request.user)
        
        # Run report job in a background thread for simplicity 
        # (In production, use Celery)
        thread = threading.Thread(target=run_report_job, args=(job.id,))
        thread.start()
        
        return Response(AIReportJobSerializer(job).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def public_chat(request):
    """
    Public endpoint for landing page chat. Does not require authentication
    and does not save the session to the database.
    """
    message = request.data.get('message')
    if not message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        response_data = process_public_chat_message(message)
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
