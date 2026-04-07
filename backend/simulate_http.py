import requests
import os

token = None
# Attempt to get a valid token or just do a quick user injection if possible?
# Wait, we need auth. Let's make a quick login request.
login_data = {
    'email': 'admin@justicehub.com',
    'password': 'adminpassword'
}
res = requests.post('http://127.0.0.1:8000/api/auth/login/', json=login_data)
if res.status_code == 200:
    token = res.json().get('access')
else:
    print("Login failed:", res.json())
    # Fallback user
    login_data['email'] = 'testcitizen_new@example.com'
    login_data['password'] = 'test1234'
    res = requests.post('http://127.0.0.1:8000/api/auth/login/', json=login_data)
    if res.status_code == 200:
        token = res.json().get('access')

if not token:
    print("Cannot get token. Using an invalid token.")
    token = "invalid"

headers = {
    'Authorization': f'Bearer {token}'
}

# The payload simulating the frontend case-wizard.jsx
data = {
    'title': 'Test Case via HTTP',
    'description': 'description here',
    'category': 'f42c279c-fad3-4589-a56f-f784de1a788d', # I will use any UUID
    'priority': 'MEDIUM',
    'defendant_name': 'Test Def',
    'document_types': ['PETITION']
}

try:
    files = {
        'documents': ('test.pdf', b'filecontent', 'application/pdf')
    }
    res = requests.post('http://127.0.0.1:8000/api/cases/', data=data, files=files, headers=headers)
    print("Status:", res.status_code)
    print("Response JSON:", res.json())
except Exception as e:
    print("Request failed:", e)
