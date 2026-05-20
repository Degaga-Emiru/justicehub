from cases.models import JudgeProfile
from rest_framework.test import APIRequestFactory
from cases.views import JudgeProfileViewSet

factory = APIRequestFactory()
p = JudgeProfile.objects.first()
if p:
    data = {"max_active_cases": 10, "status": "AVAILABLE", "specialization_ids": [str(c.id) for c in p.specializations.all()]}
    req = factory.patch(f"/cases/judge-profiles/{p.id}/", data, format="json")
    
    # We need to simulate an authenticated admin user
    from accounts.models import User
    admin = User.objects.filter(role='ADMIN').first()
    if admin:
        from rest_framework.test import force_authenticate
        force_authenticate(req, user=admin)
        
        view = JudgeProfileViewSet.as_view({"patch": "partial_update"})
        try:
            res = view(req, pk=str(p.id))
            print("Status:", res.status_code)
            if hasattr(res, "data"):
                print("Data:", res.data)
        except Exception as e:
            import traceback
            traceback.print_exc()
    else:
        print("No admin user found")
else:
    print("No judge profile found")
