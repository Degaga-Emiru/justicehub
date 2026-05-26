import os
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_sms(phone_number, message):
    """
    Send an SMS using the TextBee.dev gateway.
    """
    api_key = getattr(settings, 'TEXTBEE_API_KEY', None)
    device_id = getattr(settings, 'TEXTBEE_DEVICE_ID', None)

    if not api_key or not device_id:
        logger.warning("TextBee API key or Device ID not configured. SMS not sent.")
        # In development, just print it out
        if settings.DEBUG:
            print(f"\n--- SMS WOULD HAVE BEEN SENT ---")
            print(f"To: {phone_number}")
            print(f"Message: {message}")
            print(f"--------------------------------\n")
        return False

    url = f"https://api.textbee.dev/api/v1/gateway/devices/{device_id}/sendSMS"
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "recipients": [phone_number],
        "smsBody": message
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"SMS sent successfully to {phone_number}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
        # In development, still print it so we know it tried and failed
        if settings.DEBUG:
            print(f"Failed SMS: {str(e)}")
        return False
