from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Decision, DecisionDelivery


class DecisionDeliveryInline(admin.TabularInline):
    model = DecisionDelivery
    extra = 0
    readonly_fields = ['delivered_at', 'acknowledged_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient')


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = [
        'decision_number', 'case_link', 'decision_type',
        'judge_name', 'is_published', 'created_at'
    ]
    list_filter = ['decision_type', 'is_published', 'created_at']
    search_fields = ['decision_number', 'case__file_number', 'case__title']
    readonly_fields = ['decision_number', 'created_at', 'updated_at', 'published_at']
    inlines = [DecisionDeliveryInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('case', 'judge', 'title', 'decision_type', 'decision_number')
        }),
        ('Content', {
            'fields': ('introduction', 'background', 'analysis', 'conclusion', 'order')
        }),
        ('Legal References', {
            'fields': ('laws_cited', 'cases_cited')
        }),
        ('Document', {
            'fields': ('pdf_document',)
        }),
        ('Status', {
            'fields': ('is_published', 'published_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
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
    
    actions = ['publish_decisions', 'generate_pdf']
    
    def publish_decisions(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_published=True, published_at=timezone.now())
        self.message_user(request, f"{queryset.count()} decisions published.")
    publish_decisions.short_description = "Publish selected decisions"
    
    def generate_pdf(self, request, queryset):
        from .services import generate_decision_pdf
        count = 0
        for decision in queryset:
            if generate_decision_pdf(decision):
                count += 1
        self.message_user(request, f"PDF generated for {count} decisions.")
    generate_pdf.short_description = "Generate PDF for selected"


@admin.register(DecisionDelivery)
class DecisionDeliveryAdmin(admin.ModelAdmin):
    list_display = ['decision', 'recipient_email', 'method', 'delivered_at', 'acknowledged_at']
    list_filter = ['method', 'delivered_at']
    search_fields = ['decision__decision_number', 'recipient__email']
    readonly_fields = ['delivered_at', 'acknowledged_at']
    
    def recipient_email(self, obj):
        return obj.recipient.email
    recipient_email.short_description = 'Recipient'