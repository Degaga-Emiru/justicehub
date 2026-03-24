from rest_framework import serializers
from .models import Payment, Transaction

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'case', 'amount', 'tx_ref', 'status', 
            'payment_url', 'chapa_transaction_id', 'paid_at', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'paid_at']

class PaymentInitiateResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    data = serializers.DictField()

class ManualPaymentConfirmationSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference_number = serializers.CharField(max_length=100)
    transaction_id = serializers.CharField(max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True)
