import random
import string
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.utils.html import strip_tags
from .models import OTP

def generate_otp():
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))

# Update the existing send_html_email function to handle errors better
def send_html_email(subject, template_name, context, recipient_list):
    """
    Send HTML email with plain text fallback and error handling.
    """
    try:
        # Render HTML content
        html_content = render_to_string(template_name, context)
        
        # Create plain text version by stripping HTML tags
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list,
        )
        
        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send(fail_silently=False)
        
        # Log success (optional)
        print(f"Email sent successfully to {recipient_list}")
        
    except Exception as e:
        # Log error but don't break the application
        print(f"Failed to send email to {recipient_list}: {str(e)}")
        
        # Fallback to console in development
        if settings.DEBUG:
            print(f"Email would have been sent: {subject}")
            print(f"To: {recipient_list}")
            print(f"Context: {context}")

def send_otp_email(user, purpose='VERIFICATION'):
    """
    Generate and send OTP to user's email using HTML templates.
    Returns the OTP object.
    """
    # Generate OTP code
    code = generate_otp()
    
    # Create OTP record
    otp = OTP.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timezone.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    )
    
    # Common context for all emails
    context = {
        'user': user,
        'otp_code': code,
        'expiry_minutes': settings.OTP_EXPIRE_MINUTES,
        'current_year': timezone.now().year,
        'frontend_url': settings.FRONTEND_URL,
    }
    
    # Send email based on purpose using HTML templates
    if purpose == 'VERIFICATION':
        subject = 'Verify your email - Justice Hub'
        template_name = 'emails/verification_email.html'
        
    elif purpose == 'PASSWORD_RESET':
        subject = 'Reset your password - Justice Hub'
        template_name = 'emails/password_reset_email.html'
        
    elif purpose == 'ACCOUNT_SETUP':
        subject = 'Set up your account - Justice Hub'
        template_name = 'emails/account_setup_email.html'
        
        # Add role-specific info to context
        context['role_display'] = user.get_role_display()
        
    else:
        # Fallback to simple email
        subject = 'Your OTP - Justice Hub'
        message = f"""
        Dear {user.get_full_name()},
        
        Your OTP is: {code}
        
        This OTP will expire in {settings.OTP_EXPIRE_MINUTES} minutes.
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return otp
    
    # Send HTML email
    try:
        send_html_email(
            subject=subject,
            template_name=template_name,
            context=context,
            recipient_list=[user.email]
        )
    except Exception as e:
        # Fallback to plain text if HTML fails
        print(f"HTML email failed, sending plain text. Error: {e}")
        plain_message = f"""
        Dear {user.get_full_name()},
        
        Your OTP is: {code}
        
        This OTP will expire in {settings.OTP_EXPIRE_MINUTES} minutes.
        
        Regards,
        Justice Hub Team
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    
    return otp


def verify_otp(user, code, purpose='VERIFICATION', mark_used=True):
    """
    Verify OTP for user.
    Returns (bool, message)
    """
    # 1. Check if the code exists for this user at all (not used and not expired)
    matching_otps = OTP.objects.filter(
        user=user,
        code=code,
        is_used=False,
        expires_at__gt=timezone.now()
    )
    
    if not matching_otps.exists():
        return False, "Invalid or expired OTP"
        
    # 2. Check if any match the specific purpose
    otp = matching_otps.filter(purpose=purpose).first()
    
    if not otp:
        # Code exists but for a different purpose
        actual_purpose = matching_otps.first().purpose
        purpose_display = actual_purpose.replace('_', ' ').lower()
        return False, f"This OTP is intended for {purpose_display}. Please use the correct page."
        
    # 3. Mark as used if requested
    if mark_used:
        otp.is_used = True
        otp.save()
    
    return True, "OTP verified successfully"

def validate_password_strength(password):
    """
    Validate password strength.
    Returns (bool, message)
    """
    if len(password) < 9:
        return False, "Password must be at least 9 characters long"
    
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one number"
    
    if not any(char.isalpha() for char in password):
        return False, "Password must contain at least one letter"
    
    return True, "Password is strong"
# Add these new functions:

def send_password_change_notification(user):
    """
    Send notification email when user changes their password.
    """
    subject = 'Security Alert: Your Justice Hub Password Was Changed'
    template_name = 'emails/password_changed_email.html'
    
    context = {
        'user': user,
        'change_time': timezone.now().strftime("%B %d, %Y at %I:%M %p"),
        'current_year': timezone.now().year,
    }
    
    send_html_email(
        subject=subject,
        template_name=template_name,
        context=context,
        recipient_list=[user.email]
    )

def send_password_reset_confirmation(user):
    """
    Send confirmation email when password is reset via forgot password.
    """
    subject = 'Confirmation: Your Justice Hub Password Was Reset'
    template_name = 'emails/password_reset_confirmation_email.html'
    
    context = {
        'user': user,
        'reset_time': timezone.now().strftime("%B %d, %Y at %I:%M %p"),
        'current_year': timezone.now().year,
    }
    
    send_html_email(
        subject=subject,
        template_name=template_name,
        context=context,
        recipient_list=[user.email]
    )

def send_admin_reset_email(user, temp_password):
    """
    Send email to user with temporary password when reset by admin.
    """
    subject = 'Your Justice Hub Password Has Been Reset'
    template_name = 'emails/admin_password_reset_email.html'
    
    context = {
        'user': user,
        'temp_password': temp_password,
        'frontend_url': settings.FRONTEND_URL,
        'current_year': timezone.now().year,
    }
    
    send_html_email(
        subject=subject,
        template_name=template_name,
        context=context,
        recipient_list=[user.email]
    )
