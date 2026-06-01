import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from cases.models import JudgeProfile

updated = 0
for jp in JudgeProfile.objects.all():
    jp.max_active_cases = 50
    jp.save()
    updated += 1

print(f"Updated {updated} judge profiles to max_active_cases=50.")
