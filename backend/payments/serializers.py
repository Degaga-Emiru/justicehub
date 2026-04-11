from rest_framework import serializers
from .models import Payment, Transaction


class PaymentSerializer(serializers.ModelSerializer):
    case_file_number = serializers.CharField(source='case.file_number', read_only=True)
    case_title = serializers.CharField(source='case.title', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'case', 'case_file_number', 'case_title', 'user', 'user_name', 
            'amount', 'tx_ref', 'status', 'payment_method', 'notes',
            'payment_url', 'chapa_transaction_id', 'paid_at', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'paid_at']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.email
        return "Unknown"

class PaymentInitiateResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    data = serializers.DictField()

class BankTransferSubmissionSerializer(serializers.Serializer):
    """Serializer for citizens to submit bank transfer proof"""
    case_id = serializers.UUIDField()
    transaction_reference = serializers.CharField(max_length=100)
    sender_name = serializers.CharField(max_length=200)
    bank_name = serializers.CharField(max_length=200)
    transaction_date = serializers.DateField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class ManualPaymentConfirmationSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference_number = serializers.CharField(max_length=100)
    transaction_id = serializers.CharField(max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True)
