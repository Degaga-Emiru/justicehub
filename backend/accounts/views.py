from rest_framework import status, generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

import csv
import io
import json
from django.db.models import Count, Q, ProtectedError
from django.http import HttpResponse
from .models import User, OTP
from .serializers import (
    CitizenRegistrationSerializer, AdminCreateUserSerializer,
    VerifyOTPSerializer, ResendOTPSerializer, SetPasswordAfterOTPSerializer,
    LoginSerializer, ForgotPasswordSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, UserProfileSerializer, TokenResponseSerializer,
    UserAdminDetailSerializer, UserToggleStatusSerializer, AdminResetPasswordSerializer,
    BulkUserActionSerializer, RoleSerializer, CustomRoleCreateSerializer,
    RolePermissionUpdateSerializer, ProfileUpdateSerializer, ProfilePictureSerializer
)
from audit_logs.services import create_audit_log
from audit_logs.models import AuditLog
from .permissions import IsAdmin
from .utils import send_otp_email, send_admin_reset_email
from .utils import send_password_change_notification, send_password_reset_confirmation

class CitizenRegistrationView(generics.CreateAPIView):
    """Endpoint for citizens to register themselves."""
    queryset = User.objects.all()
    serializer_class = CitizenRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.USER_CREATED,
            obj=user,
            description=f"New user registered: {user.email} with role {user.role}",
            entity_name=user.email
        )
        
        return Response({
            "message": "Registration successful. Please check your email for OTP verification.",
            "email": user.email
        }, status=status.HTTP_201_CREATED)


class AdminCreateUserView(generics.CreateAPIView):
    """Endpoint for admin to create Lawyer, Judge, Clerk, Defendant accounts."""
    queryset = User.objects.all()
    serializer_class = AdminCreateUserSerializer
    permission_classes = [IsAdmin]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Auto-create JudgeProfile for JUDGE users with specializations
        if user.role == 'JUDGE':
            from cases.models import JudgeProfile
            profile, _ = JudgeProfile.objects.get_or_create(
                user=user,
                defaults={
                    'max_active_cases': 3,
                    'is_active': True,
                    'years_of_experience': 0,
                }
            )
            # Set specializations from the request data
            specialization_ids = getattr(user, '_specialization_ids', [])
            if specialization_ids:
                profile.specializations.set(specialization_ids)
        
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.USER_CREATED,
            obj=user,
            description=f"User created by admin: {user.email} with role {user.role}",
            entity_name=user.email
        )
        
        return Response({
            "message": f"User created successfully. OTP sent to {user.email} for account setup.",
            "email": user.email,
            "role": user.role
        }, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    """Endpoint to verify OTP."""
    permission_classes = [permissions.AllowAny]
    serializer_class = VerifyOTPSerializer # ✅ Set for Swagger visibility

    @extend_schema(request=VerifyOTPSerializer, responses={200: OpenApiParameter(name="message", type=str)})
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        purpose = serializer.validated_data['purpose']
        
        if purpose == 'VERIFICATION':
            user.is_verified = True
            user.is_active = True
            user.save()
            return Response({"message": "Email verified successfully. You can now login."}, status=status.HTTP_200_OK)
        
        elif purpose == 'ACCOUNT_SETUP':
            return Response({"message": "OTP verified. Please set your password.", "email": user.email}, status=status.HTTP_200_OK)
        
        elif purpose == 'PASSWORD_RESET':
            return Response({"message": "OTP verified. Please reset your password.", "email": user.email}, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    """Endpoint to resend OTP."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ResendOTPSerializer

    @extend_schema(request=ResendOTPSerializer)
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"message": f"OTP resent successfully to {serializer.validated_data['email']}"}, status=status.HTTP_200_OK)


class SetPasswordAfterOTPView(APIView):
    """Endpoint for users created by admin to set their password after OTP verification."""
    permission_classes = [permissions.AllowAny]
    serializer_class = SetPasswordAfterOTPSerializer

    @extend_schema(request=SetPasswordAfterOTPSerializer, responses={200: TokenResponseSerializer})
    def post(self, request):
        serializer = SetPasswordAfterOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "Password set successfully. You are now logged in.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


class LoginView(APIView):
    """Endpoint for user login."""
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer # ✅ Essential for Swagger fields to appear

    @extend_schema(
        request=LoginSerializer,
        responses={200: TokenResponseSerializer},
        description="Login with email and password to receive JWT tokens."
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.LOGIN,
            obj=user,
            description=f"User {user.email} logged in successfully."
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view."""
    @extend_schema(responses={200: TokenResponseSerializer})
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except InvalidToken:
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """Endpoint for forgot password - sends OTP."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ForgotPasswordSerializer

    @extend_schema(request=ForgotPasswordSerializer)
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": f"OTP sent to {user.email} for password reset. Please check your email."}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    """Endpoint to reset password using OTP."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ResetPasswordSerializer

    @extend_schema(request=ResetPasswordSerializer)
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        try:
            send_password_reset_confirmation(user)
        except Exception as e:
            print(f"Failed to send password reset confirmation: {e}")
        
        return Response({"message": "Password reset successful."}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Endpoint for authenticated users to change password."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    @extend_schema(request=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        try:
            send_password_change_notification(request.user)
        except Exception as e:
            print(f"Failed to send password change notification: {e}")
        
        return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Endpoint to get and update user profile."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return ProfileUpdateSerializer
        return UserProfileSerializer
    
    def get_object(self):
        return self.request.user


class ProfilePictureUploadView(APIView):
    """Endpoint to upload or update profile picture image."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = ProfilePictureSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Log Profile Picture Update
        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.USER_UPDATED,
            obj=request.user,
            description=f"User {request.user.email} updated profile picture.",
            entity_name=request.user.email
        )
        
        return Response({
            "message": "Profile picture updated successfully.",
            "profile_picture": request.user.profile_picture.url if request.user.profile_picture else None
        }, status=status.HTTP_200_OK)


class UserListView(generics.ListAPIView):
    """Endpoint for admin to list all users."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-date_joined')


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Endpoint for admin to manage specific user."""
    serializer_class = UserAdminDetailSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    lookup_field = 'id'


class AdminUserViewSet(viewsets.ModelViewSet):
    """ViewSet for comprehensive admin user management."""
    queryset = User.objects.all()
    serializer_class = UserAdminDetailSerializer
    permission_classes = [IsAdmin]
    lookup_field = 'id'



    def get_serializer_class(self):
        if self.action == 'list':
            return UserProfileSerializer
        return super().get_serializer_class()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response({"detail": "User deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {"detail": "This user cannot be deleted. They are permanently linked to official court records (Cases, Decisions, or Financial ledgers). Consider deactivating their account instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"detail": f"Deletion failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filters
        role = self.request.query_params.get('role')
        status = self.request.query_params.get('status')
        verified = self.request.query_params.get('verified')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        sort_by = self.request.query_params.get('sort_by', 'date_joined')
        sort_order = self.request.query_params.get('sort_order', 'desc')

        if role:
            qs = qs.filter(role=role)
        if status:
            is_active = (status == 'active')
            qs = qs.filter(is_active=is_active)
        if verified:
            is_verified = (verified.lower() == 'true')
            qs = qs.filter(is_verified=is_verified)
        if date_from:
            qs = qs.filter(date_joined__gte=date_from)
        if date_to:
            qs = qs.filter(date_joined__lte=date_to)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )

        order_prefix = '-' if sort_order == 'desc' else ''
        return qs.order_by(f"{order_prefix}{sort_by}")

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Overview of user statistics and management tools."""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        pending_verification = User.objects.filter(is_verified=False).count()
        
        users_by_role = User.objects.values('role').annotate(count=Count('id'))
        role_stats = {item['role']: item['count'] for item in users_by_role}

        recent = User.objects.all().order_by('-date_joined')[:5]
        recent_data = UserProfileSerializer(recent, many=True).data

        return Response({
            "total_users": total_users,
            "active_users": active_users,
            "pending_verification": pending_verification,
            "users_by_role": role_stats,
            "recent_registrations": recent_data,
            "pending_approvals": 0
        })

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request):
        """Create multiple users at once (CSV/JSON upload)."""
        import csv
        import io
        
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=400)
            
        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        
        total = 0
        successful = 0
        failed = 0
        results = []
        
        for row in reader:
            total += 1
            try:
                email = row.get('email')
                if not email:
                    continue
                if User.objects.filter(email=email).exists():
                    failed += 1
                    results.append({"email": email, "status": "failed", "error": "Email already exists"})
                    continue
                    
                user = User.objects.create_user(
                    email=email,
                    first_name=row.get('first_name', ''),
                    last_name=row.get('last_name', ''),
                    phone_number=row.get('phone_number', ''),
                    role=row.get('role', 'CITIZEN'),
                    is_active=True,
                    is_verified=True
                )
                successful += 1
                results.append({"email": email, "status": "success", "user_id": str(user.id)})
            except Exception as e:
                failed += 1
                results.append({"email": row.get('email'), "status": "failed", "error": str(e)})
                
        return Response({
            "total": total,
            "successful": successful,
            "failed": failed,
            "results": results
        })

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, id=None):
        """Deactivate/Activate User."""
        user = self.get_object()
        serializer = UserToggleStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        user.is_active = (action == 'activate')
        user.status_reason = serializer.validated_data['reason']
        user.save()

        create_audit_log(
            request=request,
            action_type=AuditLog.ActionType.USER_ACTIVATED if user.is_active else AuditLog.ActionType.USER_DEACTIVATED,
            obj=user,
            description=f"User {user.email} status changed to {'active' if user.is_active else 'inactive'}: {user.status_reason}"
        )

        return Response({
            "id": str(user.id),
            "email": user.email,
            "status": "active" if user.is_active else "inactive",
            "updated_at": timezone.now(),
            "message": f"User {action}d successfully"
        })

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, id=None):
        """Force password reset for a user."""
        user = self.get_object()
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        user.set_password(temp_password)
        user.is_password_set = False
        user.save()
        
        if serializer.validated_data['send_email']:
            try:
                send_admin_reset_email(user, temp_password)
            except Exception as e:
                print(f"Failed to send admin reset email: {e}")
        
        return Response({
            "message": "Password reset successfully",
            "temporary_password": temp_password if not serializer.validated_data['send_email'] else "Sent via email",
            "reset_at": timezone.now()
        })

    @action(detail=False, methods=['post'], url_path='bulk-action')
    def bulk_action(self, request):
        """Perform actions on multiple users."""
        serializer = BulkUserActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        action_type = serializer.validated_data['action']
        
        users = User.objects.filter(id__in=user_ids)
        successful = 0
        
        for user in users:
            if action_type == 'activate':
                user.is_active = True
            elif action_type == 'deactivate':
                user.is_active = False
            elif action_type == 'verify':
                user.is_verified = True
            user.save()
            successful += 1
            
        return Response({
            "total": len(user_ids),
            "successful": successful,
            "failed": len(user_ids) - successful,
            "results": [{"user_id": str(uid), "status": "success"} for uid in user_ids]
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export user data in CSV format."""
        qs = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Status', 'Verified', 'Joined'])
        
        for user in qs:
            writer.writerow([
                user.id, user.email, user.first_name, user.last_name, 
                user.role, 'Active' if user.is_active else 'Inactive', 
                user.is_verified, user.date_joined
            ])
            
        return response

    @action(detail=True, methods=['get'])
    def permissions(self, request, id=None):
        """Get user permissions."""
        user = self.get_object()
        return Response({
            "user_id": str(user.id),
            "role": user.role,
            "inherited_permissions": [],
            "custom_permissions": [],
            "all_permissions": []
        })


class AdminRoleViewSet(viewsets.ViewSet):
    """ViewSet for role and permission management."""
    permission_classes = [IsAdmin]

    def list(self, request):
        roles = User.Role.choices
        data = []
        for role_name, display_name in roles:
            data.append({
                "name": role_name,
                "display_name": display_name,
                "description": f"Role for {display_name}",
                "user_count": User.objects.filter(role=role_name).count(),
                "permissions": ["*"] if role_name == 'ADMIN' else []
            })
        return Response({"roles": data})

    def create(self, request):
        serializer = CustomRoleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put'], url_path='(?P<role_name>[^/.]+)')
    def update_role(self, request, role_name=None):
        serializer = RolePermissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"message": f"Role {role_name} updated"})
