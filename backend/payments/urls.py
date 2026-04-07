from django.urls import path
from .views import PaymentSubmitView, PaymentListView, PaymentVerifyView

urlpatterns = [
    path('submit/', PaymentSubmitView.as_view(), name='payment-submit'),
    path('<uuid:pk>/verify/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('', PaymentListView.as_view(), name='payment-list'),
]
