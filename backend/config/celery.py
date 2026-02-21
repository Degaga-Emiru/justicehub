import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('justicehub')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'send-hearing-reminders': {
        'task': 'hearings.tasks.send_hearing_reminders',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    'cleanup-expired-otps': {
        'task': 'accounts.tasks.cleanup_expired_otps',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    'check-decision-acknowledgments': {
        'task': 'decisions.tasks.check_decision_acknowledgments',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
    },
}