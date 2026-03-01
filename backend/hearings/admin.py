from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Hearing, HearingParticipant, HearingReminder


class HearingParticipantInline(admin.TabularInline):
    model = HearingParticipant
    extra = 0
    readonly_fields = ['invited_at', 'responded_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


class HearingReminderInline(admin.TabularInline):
    model = HearingReminder
    extra = 0
    readonly_fields = ['created_at', 'sent_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Hearing)
class HearingAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'case_link', 'hearing_type', 'status',
        'scheduled_date', 'judge_name', 'created_at'
    ]
    list_filter = ['hearing_type', 'status', 'scheduled_date']
    search_fields = ['title', 'case__file_number', 'case__title']
    readonly_fields = ['created_at', 'updated_at', 'completed_at', 'cancelled_at']
    inlines = [HearingParticipantInline, HearingReminderInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('case', 'judge', 'title', 'hearing_type', 'status')
        }),
        ('Scheduling', {
            'fields': ('scheduled_date', 'duration_minutes', 'location', 'virtual_meeting_link')
        }),
        ('Details', {
            'fields': ('agenda', 'notes', 'is_public')
        }),
        ('Recording', {
            'fields': ('recording_url', 'transcript_url')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at', 'cancelled_at')
        }),
    )
    
    def case_link(self, obj):
        if obj.case_id:
            url = reverse('admin:cases_case_change', args=[obj.case_id])
            return format_html('<a href="{}">{}</a>', url, obj.case.file_number)
        return "-"
    case_link.short_description = 'Case'
    
    def judge_name(self, obj):
        return obj.judge.get_full_name()
    judge_name.short_description = 'Judge'
    judge_name.admin_order_field = 'judge__first_name'
    
    actions = ['mark_as_completed', 'mark_as_cancelled', 'send_reminders']
    
    def mark_as_completed(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='COMPLETED', completed_at=timezone.now())
        self.message_user(request, f"{queryset.count()} hearings marked as completed.")
    mark_as_completed.short_description = "Mark selected as completed"
    
    def mark_as_cancelled(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='CANCELLED', cancelled_at=timezone.now())
        self.message_user(request, f"{queryset.count()} hearings marked as cancelled.")
    mark_as_cancelled.short_description = "Mark selected as cancelled"
    
    def send_reminders(self, request, queryset):
        from .services import send_hearing_reminders
        count = 0
        for hearing in queryset.filter(status='SCHEDULED'):
            if send_hearing_reminders(hearing):
                count += 1
        self.message_user(request, f"Reminders sent for {count} hearings.")
    send_reminders.short_description = "Send reminders for selected"


@admin.register(HearingParticipant)
class HearingParticipantAdmin(admin.ModelAdmin):
    list_display = ['hearing', 'user_email', 'role_in_hearing', 'attendance_status', 'responded_at']
    list_filter = ['attendance_status', 'role_in_hearing']
    search_fields = ['user__email', 'hearing__title']
    readonly_fields = ['invited_at', 'responded_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Participant'
    user_email.admin_order_field = 'user__email'


@admin.register(HearingReminder)
class HearingReminderAdmin(admin.ModelAdmin):
    list_display = ['hearing', 'user_email', 'reminder_type', 'scheduled_for', 'is_sent', 'sent_at']
    list_filter = ['reminder_type', 'is_sent']
    search_fields = ['user__email', 'hearing__title']
    readonly_fields = ['created_at', 'sent_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'