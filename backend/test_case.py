from cases.models import Case
from cases.serializers import JudgeCaseSerializer

case = Case.objects.first()
if case:
    serializer = JudgeCaseSerializer(case)
    print(serializer.data)
else:
    print("No case found")
