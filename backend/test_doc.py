import os, django, json, uuid
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from cases.models import Case
from cases.serializers import CaseDetailSerializer

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID): return str(obj)
        return super().default(obj)

case = Case.objects.order_by('-created_at').first()
if case:
    data = CaseDetailSerializer(case).data
    print(json.dumps(data.get('documents', []), cls=UUIDEncoder, indent=2))

