from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken

from .models import User, OTP
from .serializers import (
    CitizenRegistrationSerializer, AdminCreateUserSerializer,
    VerifyOTPSerializer, ResendOTPSerializer, SetPasswordAfterOTPSerializer,
    LoginSerializer, ForgotPasswordSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, UserProfileSerializer, TokenResponseSerializer
)
from .permissions import IsAdmin
from .utils import send_otp_email
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
        
        return Response({
            "message": f"User created successfully. OTP sent to {user.email} for account setup.",
            "email": user.email,
            "role": user.role
        }, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    """Endpoint to verify OTP."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        purpose = serializer.validated_data['purpose']
        
        # Update user status based on purpose
        if purpose == 'VERIFICATION':
            user.is_verified = True
            user.is_active = True
            user.save()
            
            return Response({
                "message": "Email verified successfully. You can now login."
            }, status=status.HTTP_200_OK)
        
        elif purpose == 'ACCOUNT_SETUP':
            return Response({
                "message": "OTP verified. Please set your password.",
                "email": user.email
            }, status=status.HTTP_200_OK)
        
        elif purpose == 'PASSWORD_RESET':
            return Response({
                "message": "OTP verified. Please reset your password.",
                "email": user.email
            }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    """Endpoint to resend OTP."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # OTP already sent in serializer validation
        return Response({
            "message": f"OTP resent successfully to {serializer.validated_data['email']}"
        }, status=status.HTTP_200_OK)


class SetPasswordAfterOTPView(APIView):
    """Endpoint for users created by admin to set their password after OTP verification."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = SetPasswordAfterOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens for auto-login
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
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view."""
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except InvalidToken:
            return Response({
                "error": "Invalid or expired refresh token"
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """Endpoint for forgot password - sends OTP."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Note: OTP email is already sent in serializer.save()
        # We don't send additional email here to avoid spam
        
        return Response({
            "message": f"OTP sent to {user.email} for password reset. Please check your email."
        }, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    """Endpoint to reset password using OTP."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Send password reset confirmation email
        try:
            send_password_reset_confirmation(user)
        except Exception as e:
            print(f"Failed to send password reset confirmation: {e}")
        
        return Response({
            "message": "Password reset successful. A confirmation email has been sent to your registered email address. You can now login with your new password."
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Endpoint for authenticated users to change password."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Send password change notification email
        try:
            send_password_change_notification(request.user)
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to send password change notification: {e}")
        
        return Response({
            "message": "Password changed successfully. A confirmation email has been sent to your registered email address. Please login again with your new password."
        }, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Endpoint to get and update user profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """Endpoint for admin to list all users."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-date_joined')


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Endpoint for admin to manage specific user."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    lookup_field = 'id'