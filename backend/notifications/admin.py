from django.contrib import admin
from django.utils.html import format_html
from .models import Notification, NotificationPreference
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user_email', 'type', 'priority', 'is_read', 'email_sent', 'created_at']
    list_filter = ['type', 'priority', 'is_read', 'email_sent', 'created_at']
    search_fields = ['title', 'message', 'user__email', 'user__first_name']
    readonly_fields = ['created_at', 'read_at']
    
    fieldsets = (
        ('Recipient', {
            'fields': ('user', 'case')
        }),
        ('Content', {
            'fields': ('type', 'priority', 'title', 'message')
        }),
        ('Rich Content', {
            'fields': ('action_url', 'icon', 'metadata')
        }),
        ('Status', {
            'fields': ('is_read', 'is_archived', 'email_sent', 'push_sent', 'read_at', 'expires_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    actions = ['mark_as_read', 'mark_as_unread', 'resend_email']
    
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f"{queryset.count()} notifications marked as read.")
    mark_as_read.short_description = "Mark selected as read"
    
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False, read_at=None)
        self.message_user(request, f"{queryset.count()} notifications marked as unread.")
    mark_as_unread.short_description = "Mark selected as unread"
    
    def resend_email(self, request, queryset):
        from .services import send_notification_email
        count = 0
        for notification in queryset:
            if send_notification_email(notification):
                count += 1
        self.message_user(request, f"Emails resent for {count} notifications.")
    resend_email.short_description = "Resend email for selected"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'email_notifications', 'push_notifications', 'sms_notifications', 'updated_at']
    list_filter = ['email_notifications', 'push_notifications', 'sms_notifications']
    search_fields = ['user__email', 'user__first_name']
    readonly_fields = ['updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Channels', {
            'fields': ('email_notifications', 'push_notifications', 'sms_notifications')
        }),
        ('Notification Types', {
            'fields': ('case_updates', 'hearing_updates', 'decision_updates', 'document_updates', 'system_alerts')
        }),
        ('Quiet Hours', {
            'fields': ('quiet_hours_start', 'quiet_hours_end', 'timezone')
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'