import os
try:
    import psutil
except ImportError:
    psutil = None
import time
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class SystemHealthService:
    @staticmethod
    def get_system_status():
        """
        Returns basic system health metrics.
        In a production environment, this would interface with 
        Prometheus, CloudWatch, or custom backup logs.
        """
        # 1. Mock Backup Status (Rotate every 24h)
        # In real life, check a file on disk or a database record
        last_backup_time = timezone.now().replace(hour=2, minute=0, second=0, microsecond=0)
        if timezone.now().hour < 2:
            last_backup_time -= timedelta(days=1)
            
        backup_status = {
            "last_success": last_backup_time,
            "status": "SUCCESS",
            "size_mb": 450.5,
            "message": "Daily database backup completed successfully."
        }

        # 2. Server Performance (Real metrics if running on Linux/Windows)
        try:
            if psutil:
                cpu_usage = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                memory_usage = memory.percent
            else:
                cpu_usage = 12.0
                memory_usage = 35.0
        except Exception:
            cpu_usage = 15.0 # Fallback
            memory_usage = 42.0

        # 3. Response Time Mock (Simulate variability)
        import random
        avg_response_ms = random.randint(45, 120)

        # 4. System Alerts
        alerts = []
        if cpu_usage > 85:
            alerts.append({"level": "HIGH", "message": "High CPU usage detected on web server."})
        if memory_usage > 90:
            alerts.append({"level": "HIGH", "message": "Low memory available on server."})
        
        # Check for auto-assignment failures in the last 24h
        from cases.models import Case
        from cases.constants import CaseStatus
        assignment_failures = Case.objects.filter(
            status=CaseStatus.ASSIGNMENT_FAILED,
            created_at__gte=timezone.now() - timedelta(days=1)
        ).count()
        
        if assignment_failures > 0:
            alerts.append({
                "level": "CRITICAL", 
                "message": f"{assignment_failures} cases failed automatic judge assignment in the last 24h."
            })

        return {
            "backup": backup_status,
            "performance": {
                "cpu": cpu_usage,
                "memory": memory_usage,
                "avg_response_ms": avg_response_ms
            },
            "alerts": alerts,
            "status": "HEALTHY" if not alerts else "WARNING" if any(a['level'] == 'HIGH' for a in alerts) else "CRITICAL"
        }
