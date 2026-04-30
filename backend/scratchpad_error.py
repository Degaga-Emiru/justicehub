
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test.client import Client
from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken

admin_user = User.objects.filter(role='ADMIN').first()
refresh = RefreshToken.for_user(admin_user)
token = str(refresh.access_token)

client = Client()
response = client.get('/api/cases/judge-profiles/', HTTP_HOST='127.0.0.1:8000', HTTP_AUTHORIZATION=f'Bearer {token}')
print('Status:', response.status_code)
if response.status_code == 500:
    import re
    html = response.content.decode()
    match3 = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
    print('Title:', match3.group(1).strip() if match3 else 'No title')
    
    match2 = re.search(r'Exception Value:.*?<pre>(.*?)</pre>', html, re.DOTALL)
    if match2:
        print('Exception:', match2.group(1).strip())
    
    match = re.search(r'Exception Location:.*?<th>Exception Location:</th>.*?<td>(.*?)</td>', html, re.DOTALL)
    if match:
         print('Location:', match.group(1).strip())
elif response.status_code == 403:
    print('403 Forbidden:', response.content.decode())
else:
    print('Content:', response.content.decode()[:200])

