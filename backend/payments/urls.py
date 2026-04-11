from django.urls import path
from .views import (
    PaymentInitiateView, PaymentCallbackView, 
    PaymentVerifyView, PaymentByCaseView, 
    PaymentRetryView, PaymentListView,
    ManualPaymentConfirmationView,
    BankTransferSubmitView
)

urlpatterns = [
    path('bank-transfer-submit/', BankTransferSubmitView.as_view(), name='payment-bank-transfer-submit'),
    path('manual-confirm/', ManualPaymentConfirmationView.as_view(), name='payment-manual-confirm'),
    path('initiate/<uuid:case_id>/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('callback/', PaymentCallbackView.as_view(), name='payment-callback'),
    path('verify/<str:tx_ref>/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('case/<uuid:case_id>/', PaymentByCaseView.as_view(), name='payment-by-case'),
    path('retry/<uuid:case_id>/', PaymentRetryView.as_view(), name='payment-retry'),
    path('', PaymentListView.as_view(), name='payment-list'),
]
