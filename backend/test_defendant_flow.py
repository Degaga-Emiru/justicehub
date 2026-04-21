import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'justicehub.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from cases.models import Case

admin = User.objects.get(email='admin@justicehub.com')
client = APIClient()
client.force_authenticate(user=admin)

# 1. Get case list
resp = client.get('/api/cases/')
print('=== CASES LIST STATUS:', resp.status_code)
data = resp.json()
results = data.get('results', data) if isinstance(data, dict) else data
if isinstance(results, list):
    for c in results:
        print(f'  Case: {c.get("title")}, status={c.get("status")}, defendant={c.get("defendant")}, defendant_name={c.get("defendant_name")}')

# 2. Find a case with no defendant
case = Case.objects.filter(defendant__isnull=True).first()
if case:
    print(f'\n=== Testing create-defendant-account on: {case.title} (id={case.id})')
    resp2 = client.post(
        f'/api/cases/{case.id}/create-defendant-account/',
        {'email': 'testdef_flow@example.com', 'phone_number': '+11112223334', 'first_name': 'Flow', 'last_name': 'Test'},
        format='json'
    )
    print('STATUS:', resp2.status_code)
    print('BODY:', resp2.json())

    # 3. Re-fetch the case to see updated defendant data
    resp3 = client.get(f'/api/cases/{case.id}/')
    print('\n=== CASE DETAIL AFTER DEFENDANT CREATION:')
    detail = resp3.json()
    print(f'  defendant: {detail.get("defendant")}')
    print(f'  defendant_name: {detail.get("defendant_name")}')
    print(f'  defendant_address: {detail.get("defendant_address")}')

    # 4. Also check what the list serializer returns for this case
    resp4 = client.get('/api/cases/')
    data4 = resp4.json()
    results4 = data4.get('results', data4) if isinstance(data4, dict) else data4
    if isinstance(results4, list):
        for c in results4:
            if c.get('id') == str(case.id):
                print(f'\n=== LIST SERIALIZER for same case after defendant creation:')
                print(f'  defendant: {c.get("defendant")}')
                print(f'  defendant_name: {c.get("defendant_name")}')
                break

    # Cleanup
    case.refresh_from_db()
    case.defendant = None
    case.defendant_address = ''
    case.save()
    User.objects.filter(email='testdef_flow@example.com').delete()
    print('\nCleaned up')
else:
    print('No cases without defendant found')
