from django.urls import path
from .views import PaymentSubmitView

urlpatterns = [
    path('submit/', PaymentSubmitView.as_view(), name='payment-submit'),
]
