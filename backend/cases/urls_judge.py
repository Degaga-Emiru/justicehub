from django.urls import path
from .views_judge import (
    JudgeDashboardView, JudgeCaseListView, 
    JudgeCaseDetailView, JudgeCaseDocumentListView,
    JudgeDocumentDownloadView
)
from hearings.views import JudgeCaseHearingListView

urlpatterns = [
    path('dashboard', JudgeDashboardView.as_view(), name='judge-dashboard'),
    path('cases', JudgeCaseListView.as_view(), name='judge-case-list'),
    path('cases/<uuid:case_id>', JudgeCaseDetailView.as_view(), name='judge-case-detail'),
    path('cases/<uuid:case_id>/documents', JudgeCaseDocumentListView.as_view(), name='judge-case-documents'),
    path('documents/<uuid:document_id>/download', JudgeDocumentDownloadView.as_view(), name='judge-document-download'),
    path('cases/<uuid:case_id>/hearings', JudgeCaseHearingListView.as_view(), name='judge-case-hearings'),
]
