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


class PaymentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for clerk payment list with case and user info."""
    case_title = serializers.CharField(source='case.title', read_only=True)
    case_file_number = serializers.CharField(source='case.file_number', read_only=True)
    case_category = serializers.CharField(source='case.category.name', read_only=True)
    case_status = serializers.CharField(source='case.status', read_only=True)
    case_id = serializers.UUIDField(source='case.id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'case', 'case_id', 'case_title', 'case_file_number',
            'case_category', 'case_status',
            'user_name', 'user_email',
            'amount', 'transaction_reference',
            'payment_method', 'sender_name', 'bank_name',
            'transaction_date', 'status', 'notes',
            'created_at', 'updated_at'
        ]


class PaymentSubmissionSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    transaction_reference = serializers.CharField(max_length=100)
    payment_method = serializers.CharField(max_length=50, default='BANK_TRANSFER')
    sender_name = serializers.CharField(max_length=255)
    bank_name = serializers.CharField(max_length=100)
    transaction_date = serializers.DateField()
