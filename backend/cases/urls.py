from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CaseCategoryViewSet, basename='category')
router.register(r'', views.CaseViewSet, basename='case')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:pk>/assign-judge/', views.AssignJudgeView.as_view(), name='assign-judge'),
    path('<uuid:pk>/notes/', views.CaseNotesViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-notes'),
]