from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
from .models import Notification, NotificationPreference
from .services import create_notification

User = get_user_model()


class NotificationModelTests(TestCase):
    """Test Notification model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_notification(self):
        """Test creating a notification"""
        notification = Notification.objects.create(
            user=self.user,
            type='CASE_ACCEPTED',
            title='Test Notification',
            message='This is a test notification',
            priority='HIGH'
        )
        
        self.assertEqual(notification.title, 'Test Notification')
        self.assertFalse(notification.is_read)
        self.assertIsNotNone(notification.id)
    
    def test_notification_str_representation(self):
        """Test string representation"""
        notification = Notification.objects.create(
            user=self.user,
            type='CASE_ACCEPTED',
            title='Test Notification',
            message='This is a test notification'
        )
        
        expected = f"CASE_ACCEPTED: Test Notification - {self.user.email}"
        self.assertEqual(str(notification), expected)
    
    def test_mark_as_read(self):
        """Test marking notification as read"""
        notification = Notification.objects.create(
            user=self.user,
            type='CASE_ACCEPTED',
            title='Test Notification',
            message='This is a test notification'
        )
        
        notification.mark_as_read()
        
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)


class NotificationPreferenceModelTests(TestCase):
    """Test NotificationPreference model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_preferences(self):
        """Test creating notification preferences"""
        preferences = NotificationPreference.objects.create(user=self.user)
        
        self.assertEqual(preferences.user, self.user)
        self.assertTrue(preferences.email_notifications)
        self.assertTrue(preferences.case_updates)
    
    def test_preferences_str_representation(self):
        """Test string representation"""
        preferences = NotificationPreference.objects.create(user=self.user)
        
        expected = f"Preferences for {self.user.email}"
        self.assertEqual(str(preferences), expected)


class NotificationAPITests(APITestCase):
    """Test Notification API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create notifications
        self.notification1 = Notification.objects.create(
            user=self.user,
            type='CASE_ACCEPTED',
            title='Case Accepted',
            message='Your case has been accepted',
            priority='HIGH'
        )
        
        self.notification2 = Notification.objects.create(
            user=self.user,
            type='HEARING_SCHEDULED',
            title='Hearing Scheduled',
            message='A hearing has been scheduled',
            priority='MEDIUM'
        )
    
    def test_list_notifications(self):
        """Test listing notifications"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_unread_count(self):
        """Test getting unread count"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/unread_count/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 2)
    
    def test_mark_read_specific(self):
        """Test marking specific notifications as read"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/mark_read/'
        data = {
            'notification_ids': [str(self.notification1.id)]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 1)
        
        self.notification1.refresh_from_db()
        self.notification2.refresh_from_db()
        
        self.assertTrue(self.notification1.is_read)
        self.assertFalse(self.notification2.is_read)
    
    def test_mark_all_read(self):
        """Test marking all notifications as read"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/mark_read/'
        data = {'mark_all': True}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 2)
        
        self.notification1.refresh_from_db()
        self.notification2.refresh_from_db()
        
        self.assertTrue(self.notification1.is_read)
        self.assertTrue(self.notification2.is_read)
    
    def test_archive_notification(self):
        """Test archiving a notification"""
        self.client.force_authenticate(user=self.user)
        
        url = f'/api/notifications/{self.notification1.id}/archive/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'archived')
        
        self.notification1.refresh_from_db()
        self.assertTrue(self.notification1.is_archived)
    
    def test_mark_all_read_view(self):
        """Test mark all read endpoint"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/mark-all-read/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 2)
    
    def test_get_notification_preferences(self):
        """Test getting notification preferences"""
        self.client.force_authenticate(user=self.user)
        
        # Preferences should be auto-created
        url = '/api/notifications/preferences/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['email_notifications'])
    
    def test_update_notification_preferences(self):
        """Test updating notification preferences"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/preferences/'
        data = {
            'email_notifications': False,
            'push_notifications': False,
            'case_updates': True,
            'hearing_updates': False
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['email_notifications'])
        self.assertTrue(response.data['case_updates'])
    
    def test_archive_all(self):
        """Test archiving all notifications"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/archive-all/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['archived'], 2)
    
    def test_delete_read_notifications(self):
        """Test deleting read notifications"""
        # Mark one as read
        self.notification1.is_read = True
        self.notification1.save()
        
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/delete-read/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['deleted'], 1)
        
        # Check remaining notifications
        remaining = Notification.objects.filter(user=self.user).count()
        self.assertEqual(remaining, 1)
    
    def test_notification_statistics(self):
        """Test getting notification statistics"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/statistics/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['unread'], 2)
        self.assertEqual(len(response.data['by_type']), 2)
    
    def test_service_create_notification(self):
        """Test notification service"""
        notification = create_notification(
            user=self.user,
            type='DECISION_ISSUED',
            title='Test Service',
            message='Created via service',
            priority='HIGH'
        )
        
        self.assertIsNotNone(notification)
        self.assertEqual(notification.type, 'DECISION_ISSUED')
        self.assertEqual(notification.priority, 'HIGH')


class NotificationPreferenceAPITests(APITestCase):
    """Test Notification Preference API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_update_preferences_view(self):
        """Test update preferences endpoint"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/preferences/update/'
        data = {
            'email_notifications': False,
            'quiet_hours_start': '22:00:00',
            'quiet_hours_end': '08:00:00'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        preferences = NotificationPreference.objects.get(user=self.user)
        self.assertFalse(preferences.email_notifications)
        self.assertEqual(str(preferences.quiet_hours_start), '22:00:00')
    
    def test_quiet_hours_validation(self):
        """Test quiet hours validation"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/notifications/preferences/update/'
        data = {
            'quiet_hours_start': '23:00:00',
            'quiet_hours_end': '22:00:00'  # End before start
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class NotificationEnhancementTests(APITestCase):
    """Test new notification enhancements"""
    
    def setUp(self):
        from cases.models import Case
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='verify@example.com',
            password='testpass123'
        )
        
        # Create a case
        self.case = Case.objects.create(
            title="Test Case",
            description="Test Description",
            created_by=self.user
        )
        
        # Create notifications
        self.notif_read = Notification.objects.create(
            user=self.user,
            type='CASE_ACCEPTED',
            title='Read Notification',
            message='Read',
            is_read=True,
            case=self.case
        )
        self.notif_unread = Notification.objects.create(
            user=self.user,
            type='HEARING_SCHEDULED',
            title='Unread Notification',
            message='Unread',
            is_read=False,
            case=self.case
        )

    def test_nested_case_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data['results']
        for item in results:
            self.assertIn('case', item)
            self.assertIsNotNone(item['case'])
            self.assertEqual(item['case']['title'], "Test Case")
            self.assertIn('file_number', item['case'])

    def test_filtering_by_is_read(self):
        self.client.force_authenticate(user=self.user)
        # Filter for unread
        response = self.client.get('/api/notifications/?is_read=false')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.notif_unread.id))
        
        # Filter for read
        response = self.client.get('/api/notifications/?is_read=true')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.notif_read.id))

    def test_filtering_by_type(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/?type=CASE_ACCEPTED')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['type'], 'CASE_ACCEPTED')

    def test_time_ago_format(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/')
        item = response.data['results'][0]
        self.assertTrue(item['time_ago'].endswith(' ago'))