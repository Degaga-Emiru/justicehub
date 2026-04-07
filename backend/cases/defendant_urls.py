from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .defendant_views import DefendantCaseViewSet
from hearings.views import DefendantHearingView

router = DefaultRouter()
router.register(r'cases', DefendantCaseViewSet, basename='defendant-case')

urlpatterns = [
    path('', include(router.urls)),
    path('hearings/', DefendantHearingView.as_view(), name='defendant-hearings'),
]
