from rest_framework import serializers
from .models import Payment, Transaction

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'case', 'amount', 'transaction_reference', 
            'payment_method', 'sender_name', 'bank_name', 
            'transaction_date', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']

class PaymentSubmissionSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    transaction_reference = serializers.CharField(max_length=100)
    payment_method = serializers.CharField(max_length=50, default='BANK_TRANSFER')
    sender_name = serializers.CharField(max_length=255)
    bank_name = serializers.CharField(max_length=100)
    transaction_date = serializers.DateField()
