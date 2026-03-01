import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications
    """
    
    async def connect(self):
        self.user = await self.get_user()
        
        if self.user and self.user.is_authenticated:
            self.group_name = f"user_{self.user.id}"
            
            # Join group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Connected to notification service'
            }))
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'mark_read':
                await self.mark_notification_read(data.get('notification_id'))
            elif action == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': str(timezone.now())
                }))
                
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def notification_message(self, event):
        """
        Send notification to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
    
    async def mark_notification_read(self, notification_id):
        """
        Mark notification as read
        """
        from .models import Notification
        try:
            notification = await database_sync_to_async(Notification.objects.get)(
                id=notification_id,
                user=self.user
            )
            notification.is_read = True
            notification.read_at = timezone.now()
            await database_sync_to_async(notification.save)()
            
            await self.send(text_data=json.dumps({
                'type': 'marked_read',
                'notification_id': notification_id
            }))
        except Notification.DoesNotExist:
            pass
    
    @database_sync_to_async
    def get_user(self):
        """
        Get user from query string token
        """
        from django.contrib.auth.models import AnonymousUser
        
        query_string = self.scope['query_string'].decode()
        params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
        
        token = params.get('token')
        if token:
            try:
                access_token = AccessToken(token)
                user = User.objects.get(id=access_token['user_id'])
                return user
            except Exception:
                
                return AnonymousUser()
        
        return AnonymousUser()