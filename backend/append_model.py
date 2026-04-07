
import os

content = """

class CaseActionRequest(models.Model):
    \"\"\"Formal requests for action from the judge or registrar to the defendant\"\"\"
    class ActionStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        OVERDUE = 'OVERDUE', 'Overdue'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='action_requests')
    requester = models.ForeignKey(User, on_delete=models.PROTECT, related_name='actions_requested')
    
    action_description = models.TextField()
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ActionStatus.choices,
        default=ActionStatus.PENDING
    )
    
    response_text = models.TextField(blank=True, null=True)
    response_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Case Action Request"
        verbose_name_plural = "Case Action Requests"

    def __str__(self):
        return f"Action for {self.case.file_number} - {self.status}"
"""

path = r'c:\Users\HP\justicehub\backend\cases\models.py'
with open(path, 'a', encoding='utf-8') as f:
    f.write(content)
print(f"Successfully appended to {path}")
