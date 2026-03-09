import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from django.core.validators import RegexValidator
from .managers import CustomUserManager

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Personal Information
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True, db_index=True)
    
    # Phone number with validation
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, unique=True)
    
    # Role choices
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        LAWYER = 'LAWYER', 'Lawyer'
        JUDGE = 'JUDGE', 'Judge'
        CLERK = 'CLERK', 'Court Clerk'
        DEFENDANT = 'DEFENDANT', 'Defendant'
        CITIZEN = 'CITIZEN', 'Citizen'
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CITIZEN,
        db_index=True
    )

    # Demographic Information
    education_level = models.CharField(max_length=50, null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    occupation = models.CharField(max_length=100, null=True, blank=True)
    
    # Status flags
    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    
    # For users created by admin (Lawyer, Judge, Clerk, Defendant)
    is_password_set = models.BooleanField(default=False)
    
    # Audit and Status Fields (Missing in model but present in DB)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    login_count = models.PositiveIntegerField(default=0)
    status_reason = models.TextField(null=True, blank=True)
    
    objects = CustomUserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'phone_number']
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name()} - {self.email}"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        return self.first_name
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN
    
    @property
    def is_lawyer(self):
        return self.role == self.Role.LAWYER
    
    @property
    def is_judge(self):
        return self.role == self.Role.JUDGE
    
    @property
    def is_clerk(self):
        return self.role == self.Role.CLERK


class OTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=20,
        choices=[
            ('VERIFICATION', 'Email Verification'),
            ('PASSWORD_RESET', 'Password Reset'),
            ('ACCOUNT_SETUP', 'Account Setup')
        ],
        default='VERIFICATION'
    )
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.code}"
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=5)
        super().save(*args, **kwargs)