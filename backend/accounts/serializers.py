from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, OTP
from .utils import send_otp_email, verify_otp, validate_password_strength

class CitizenRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'password', 'confirm_password']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        # Validate password strength
        is_valid, message = validate_password_strength(attrs['password'])
        if not is_valid:
            raise serializers.ValidationError({"password": message})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        # Create user as inactive
        user = User.objects.create_user(
            **validated_data,
            password=password,
            role='CITIZEN',
            is_active=False,
            is_verified=False
        )
        
        # Send verification OTP
        send_otp_email(user, 'VERIFICATION')
        
        return user


class AdminCreateUserSerializer(serializers.ModelSerializer):
    specialization_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="Category UUIDs for judge specializations (required when role is JUDGE)"
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'role', 'specialization_ids']
    
    def validate_role(self, value):
        if value == 'CITIZEN':
            raise serializers.ValidationError("Citizens can self-register. Use citizen registration endpoint.")
        if value == 'ADMIN':
            raise serializers.ValidationError("Use admin creation endpoint for admin users.")
        return value

    def validate(self, attrs):
        if attrs.get('role') == 'JUDGE':
            spec_ids = attrs.get('specialization_ids', [])
            if not spec_ids:
                raise serializers.ValidationError({
                    "specialization_ids": "At least one specialization category is required for judges."
                })
        return attrs
    
    def create(self, validated_data):
        # Pop specialization_ids before creating user (not a User field)
        specialization_ids = validated_data.pop('specialization_ids', [])

        # Create user with random password (user will set their own after OTP)
        import secrets
        import string
        random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        user = User.objects.create_user(
            **validated_data,
            password=random_password,
            is_active=False,
            is_verified=False,
            is_password_set=False
        )
        
        # Store specialization_ids on the instance so the view can use them
        user._specialization_ids = specialization_ids

        # Send account setup OTP
        send_otp_email(user, 'ACCOUNT_SETUP')
        
        return user


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=['VERIFICATION', 'PASSWORD_RESET', 'ACCOUNT_SETUP'])
    
    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found"})
        
        # Verify OTP (don't mark as used for multi-step flows like password reset/setup)
        mark_used = (attrs['purpose'] == 'VERIFICATION')
        is_valid, message = verify_otp(user, attrs['otp'], attrs['purpose'], mark_used=mark_used)
        if not is_valid:
            raise serializers.ValidationError({"otp": message})
        
        attrs['user'] = user
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=['VERIFICATION', 'PASSWORD_RESET', 'ACCOUNT_SETUP'])
    
    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found"})
        
        # Check if user is already verified for verification purpose
        if attrs['purpose'] == 'VERIFICATION' and user.is_verified:
            raise serializers.ValidationError({"email": "User is already verified"})
        
        # Mark old OTPs as used
        OTP.objects.filter(user=user, purpose=attrs['purpose'], is_used=False).update(is_used=True)
        
        # Send new OTP
        send_otp_email(user, attrs['purpose'])
        
        attrs['user'] = user
        return attrs


class SetPasswordAfterOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        # Validate password strength
        is_valid, message = validate_password_strength(attrs['new_password'])
        if not is_valid:
            raise serializers.ValidationError({"new_password": message})
        
        try:
            user = User.objects.get(email=attrs['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found"})
        
        # Verify OTP
        is_valid, message = verify_otp(user, attrs['otp'], 'ACCOUNT_SETUP')
        if not is_valid:
            raise serializers.ValidationError({"otp": message})
        
        # Ensure new password is not the same as old password
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({"new_password": "New password cannot be the same as your current password"})
        
        attrs['user'] = user
        return attrs
    
    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.is_active = True
        user.is_verified = True
        user.is_password_set = True
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            
            if not user:
                raise serializers.ValidationError("Invalid email or password")
            
            if not user.is_verified:
                raise serializers.ValidationError("Email not verified. Please verify your email first.")
            
            if not user.is_active:
                raise serializers.ValidationError("Account is inactive")
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError("Must include email and password")


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
            if not user.is_verified:
                raise serializers.ValidationError("Please verify your email first")
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist")
        
        return value
    
    def save(self):
        email = self.validated_data['email']
        user = User.objects.get(email=email)
        
        # Mark old password reset OTPs as used
        OTP.objects.filter(user=user, purpose='PASSWORD_RESET', is_used=False).update(is_used=True)
        
        # Send password reset OTP
        send_otp_email(user, 'PASSWORD_RESET')
        return user


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        # Validate password strength
        is_valid, message = validate_password_strength(attrs['new_password'])
        if not is_valid:
            raise serializers.ValidationError({"new_password": message})
        
        try:
            user = User.objects.get(email=attrs['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found"})
        
        # Verify OTP
        is_valid, message = verify_otp(user, attrs['otp'], 'PASSWORD_RESET')
        if not is_valid:
            raise serializers.ValidationError({"otp": message})
        
        # Ensure new password is not the same as old password
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({"new_password": "New password cannot be the same as your current password"})
            
        attrs['user'] = user
        return attrs
    
    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        
        # Blacklist all refresh tokens for this user
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        from rest_framework_simplejwt.tokens import RefreshToken
        
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        user = self.context['request'].user
        
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "New passwords do not match"})
        
        # Check old password
        if not user.check_password(attrs['old_password']):
            raise serializers.ValidationError({"old_password": "Wrong password"})
        
        # Validate new password strength
        is_valid, message = validate_password_strength(attrs['new_password'])
        if not is_valid:
            raise serializers.ValidationError({"new_password": message})
        
        # Ensure new password is not the same as old password
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({"new_password": "New password cannot be the same as your current password"})
        
        return attrs
    
    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        
        # Blacklist all refresh tokens for this user
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
        
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email', 
            'phone_number', 'role', 'is_verified', 'is_active', 
            'date_joined', 'last_login', 'address', 'profile_picture'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'date_joined', 'last_login']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile (phone_number and address only)
    """
    class Meta:
        model = User
        fields = ['phone_number', 'address']
        
    def validate_phone_number(self, value):
        # Check if phone number already exists
        if User.objects.exclude(pk=self.instance.pk).filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return value


class ProfilePictureSerializer(serializers.ModelSerializer):
    """
    Serializer for updating profile picture
    """
    class Meta:
        model = User
        fields = ['profile_picture']
        
    def validate_profile_picture(self, value):
        from django.core.validators import FileExtensionValidator
        validator = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])
        validator(value)
        return value


class TokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserProfileSerializer()


# Admin Serializers

class UserAdminDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    judge_profile = serializers.SerializerMethodField()
    activity_log = serializers.SerializerMethodField()
    audit_trail = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone_number', 
            'role', 'is_active', 'is_verified', 'date_joined', 'last_login', 
            'last_login_ip', 'login_count', 'judge_profile', 'activity_log', 'audit_trail'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_judge_profile(self, obj):
        if obj.role == 'JUDGE':
            from cases.models import JudgeProfile, JudgeAssignment
            from hearings.models import Hearing
            from decisions.models import Decision
            
            profile = JudgeProfile.objects.filter(user=obj).first()
            if profile:
                active_cases = JudgeAssignment.objects.filter(judge=obj, is_active=True)
                assigned_cases_data = []
                for assignment in active_cases:
                    case = assignment.case
                    assigned_cases_data.append({
                        "id": str(case.id),
                        "file_number": case.file_number,
                        "title": case.title,
                        "status": case.status
                    })

                decisions_count = Decision.objects.filter(judge=obj).count()
                hearings_count = Hearing.objects.filter(judge=obj, status='COMPLETED').count()

                return {
                    "specializations": list(profile.specializations.values_list('name', flat=True)),
                    "active_cases": active_cases.count(),
                    "max_active_cases": profile.max_active_cases,
                    "cases_assigned": assigned_cases_data,
                    "decisions_issued": decisions_count,
                    "hearings_conducted": hearings_count
                }
        return None

    def get_activity_log(self, obj):
        from audit_logs.models import AuditLog
        from datetime import timedelta
        from django.utils import timezone
        
        now = timezone.now()
        last_7 = AuditLog.objects.filter(user=obj, timestamp__gte=now - timedelta(days=7)).count()
        last_30 = AuditLog.objects.filter(user=obj, timestamp__gte=now - timedelta(days=30)).count()
        
        recent = AuditLog.objects.filter(user=obj).order_by('-timestamp')[:10]
        recent_data = []
        for log in recent:
            recent_data.append({
                "action": log.action_type,
                "timestamp": log.timestamp,
                "details": log.description
            })
            
        return {
            "last_7_days": last_7,
            "last_30_days": last_30,
            "recent_actions": recent_data
        }

    def get_audit_trail(self, obj):
        return f"/api/admin/audit/entity_trail/?entity_type=accounts.user&entity_id={obj.id}"


class UserToggleStatusSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['activate', 'deactivate'])
    reason = serializers.CharField(required=True)


class AdminResetPasswordSerializer(serializers.Serializer):
    send_email = serializers.BooleanField(default=True)
    require_change_on_login = serializers.BooleanField(default=True)


class BulkUserActionSerializer(serializers.Serializer):
    user_ids = serializers.ListField(child=serializers.UUIDField())
    action = serializers.ChoiceField(choices=['activate', 'deactivate', 'verify', 'send_welcome_email'])
    reason = serializers.CharField(required=False, allow_blank=True)


class RoleSerializer(serializers.Serializer):
    name = serializers.CharField()
    display_name = serializers.CharField(source='name', required=False)
    description = serializers.CharField(default="", required=False)
    user_count = serializers.SerializerMethodField()
    permissions = serializers.ListField(child=serializers.CharField(), default=list)

    def get_user_count(self, obj):
        role_name = getattr(obj, 'name', obj)
        return User.objects.filter(role=role_name).count()


class CustomRoleCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    display_name = serializers.CharField()
    description = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())
    based_on = serializers.CharField(required=False)


class RolePermissionUpdateSerializer(serializers.Serializer):
    add = serializers.ListField(child=serializers.CharField(), required=False)
    remove = serializers.ListField(child=serializers.CharField(), required=False)
