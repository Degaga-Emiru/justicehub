import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("TEXTBEE_API_KEY")
device_id = os.getenv("TEXTBEE_DEVICE_ID")

print(f"API KEY: {api_key}")
print(f"DEVICE ID: {device_id}")

url = f"https://api.textbee.dev/api/v1/gateway/devices/{device_id}/sendSMS"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
payload = {
    "recipients": ["+251911223344"],
    "smsBody": "Test message from Justice Hub"
}

try:
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    response.raise_for_status()
    print("Success")
except Exception as e:
    print(f"Error: {e}")
