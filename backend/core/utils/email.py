import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_email_template(subject, template_name, context, recipient_list,
                        from_email=None, html_message=None, **kwargs):
    """Render a template and send an email.

    Args:
        subject (str): email subject line
        template_name (str): path to django template
        context (dict): context for rendering template
        recipient_list (list): list of email addresses
        from_email (str, optional): sender address; defaults to ``settings.DEFAULT_FROM_EMAIL``
        html_message (str, optional): if provided, used as html body instead of rendering
        **kwargs: passed along to ``EmailMultiAlternatives.send``

    Returns:
        bool: ``True`` if send succeeded, ``False`` otherwise
    """
    from_email = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", None)
    if not from_email:
        logger.warning("No from_email configured for send_email_template")

    # render the template if html_message isn't explicitly provided
    if html_message is None:
        try:
            html_message = render_to_string(template_name, context)
        except Exception as exc:
            logger.exception("Failed to render email template %s: %s", template_name, exc)
            return False

    try:
        msg = EmailMultiAlternatives(subject=subject, body=html_message,
                                     from_email=from_email,
                                     to=recipient_list)
        # assume html content, set subtype if not plain text
        msg.attach_alternative(html_message, "text/html")
        msg.send(**kwargs)
        return True
    except Exception as exc:
        logger.exception("Error sending email to %s: %s", recipient_list, exc)
        return False
