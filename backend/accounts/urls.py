from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'admin/users', views.AdminUserViewSet, basename='admin-users')
router.register(r'admin/roles', views.AdminRoleViewSet, basename='admin-roles')

urlpatterns = [
    # Router-based admin endpoints
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('auth/citizen-register/', views.CitizenRegistrationView.as_view(), name='citizen-register'),
    path('auth/admin-create-user/', views.AdminCreateUserView.as_view(), name='admin-create-user'),
    path('auth/verify-otp/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/resend-otp/', views.ResendOTPView.as_view(), name='resend-otp'),
    path('auth/set-password/', views.SetPasswordAfterOTPView.as_view(), name='set-password'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/token/refresh/', views.CustomTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # User profile
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    
    # Admin user management (legacy/individual paths)
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:id>/', views.UserDetailView.as_view(), name='user-detail'),
]