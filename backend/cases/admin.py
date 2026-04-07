from django.contrib import admin
from django.utils.html import format_html
from .models import CaseCategory, Case, CaseDocument, CaseDocumentVersion, JudgeAssignment, CaseNotes

@admin.register(CaseCategory)
class CaseCategoryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']


class CaseDocumentInline(admin.TabularInline):
    model = CaseDocument
    extra = 0
    fields = ['document_type', 'is_confidential', 'uploaded_at']
    readonly_fields = ['uploaded_at']


class CaseDocumentVersionInline(admin.TabularInline):
    model = CaseDocumentVersion
    extra = 0
    readonly_fields = ['version_number', 'file_name', 'file_size', 'checksum', 'uploaded_at', 'uploaded_by']


class JudgeAssignmentInline(admin.TabularInline):
    model = JudgeAssignment
    extra = 0
    readonly_fields = ['assigned_at', 'ended_at']


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['file_number', 'title', 'category', 'status', 'priority', 'created_by', 'created_at']
    list_filter = ['status', 'priority', 'category', 'created_at']
    search_fields = ['file_number', 'title', 'created_by__email']
    readonly_fields = ['file_number', 'created_at', 'updated_at']
    inlines = [CaseDocumentInline, JudgeAssignmentInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'case_summary', 'category', 'priority')
        }),
        ('Case Numbering', {
            'fields': ('file_number', 'status')
        }),
        ('Parties', {
            'fields': ('created_by', 'plaintiff', 'defendant', 'plaintiff_lawyer', 'defendant_lawyer')
        }),
        ('Court Information', {
            'fields': ('court_name', 'court_room')
        }),
        ('Review Information', {
            'fields': ('reviewed_by', 'reviewed_at', 'rejection_reason')
        }),
        ('Dates', {
            'fields': ('filing_date', 'closed_date', 'created_at', 'updated_at')
        }),
    )
    
    def view_documents(self, obj):
        count = obj.documents.count()
        return format_html('<a href="{}">{} documents</a>', 
                          f"/admin/cases/casedocument/?case__id={obj.id}", count)
    view_documents.short_description = 'Documents'


@admin.register(CaseDocument)
class CaseDocumentAdmin(admin.ModelAdmin):
    list_display = ['case', 'document_type', 'uploaded_by', 'uploaded_at', 'is_confidential']
    list_filter = ['document_type', 'is_confidential', 'uploaded_at']
    search_fields = ['case__file_number', 'case__title']
    readonly_fields = ['uploaded_at']
    inlines = [CaseDocumentVersionInline]


@admin.register(CaseDocumentVersion)
class CaseDocumentVersionAdmin(admin.ModelAdmin):
    list_display = ['document', 'version_number', 'file_name', 'status', 'uploaded_by', 'uploaded_at']
    list_filter = ['status', 'uploaded_at']
    search_fields = ['file_name', 'document__case__file_number']
    readonly_fields = ['checksum', 'file_size', 'uploaded_at']


@admin.register(JudgeAssignment)
class JudgeAssignmentAdmin(admin.ModelAdmin):
    list_display = ['case', 'judge', 'assigned_by', 'assigned_at', 'is_active']
    list_filter = ['is_active', 'assigned_at']
    search_fields = ['case__file_number', 'judge__email']
    readonly_fields = ['assigned_at']


@admin.register(CaseNotes)
class CaseNotesAdmin(admin.ModelAdmin):
    list_display = ['title', 'case', 'author', 'is_private', 'created_at']
    list_filter = ['is_private', 'created_at']
    search_fields = ['title', 'case__file_number', 'author__email']