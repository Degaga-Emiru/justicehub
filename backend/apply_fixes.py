
import os

def append_model():
    path = r'c:\Users\HP\justicehub\backend\cases\models.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add acknowledgement fields to Case model
    if 'is_defendant_acknowledged' not in content:
        # Look for the end of the Case fields before Meta
        search_str = 'updated_at = models.DateTimeField(auto_now=True)'
        if search_str in content:
            replacement = search_str + '\n\n    # Acknowledgement\n    is_defendant_acknowledged = models.BooleanField(default=False)\n    acknowledged_at = models.DateTimeField(null=True, blank=True)'
            content = content.replace(search_str, replacement)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added acknowledgement fields to {path}")

    # Append CaseActionRequest model
    model_code = """

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
    # Re-read content to check for model
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'class CaseActionRequest' not in content:
        with open(path, 'a', encoding='utf-8') as f:
            f.write(model_code)
        print(f"Appended model to {path}")

def append_serializer():
    path = r'c:\Users\HP\justicehub\backend\cases\serializers.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add import - very specific to avoid unintended replacements
    # The models are imported like:
    # 4: from .models import (
    # 5:     CaseCategory, Case, CaseDocument, CaseDocumentVersion,
    # 6:     JudgeAssignment, CaseNotes, JudgeProfile,
    # 7:     CaseStatus
    # 8: )
    if 'CaseActionRequest' not in content:
        if 'CaseStatus\n)' in content:
            content = content.replace('CaseStatus\n)', 'CaseStatus, CaseActionRequest\n)')
        elif 'CaseStatus\r\n)' in content:
            content = content.replace('CaseStatus\r\n)', 'CaseStatus, CaseActionRequest\r\n)')
    
    # Add serializer
    serializer_code = """

class CaseActionRequestSerializer(serializers.ModelSerializer):
    \"\"\"Serializer for CaseActionRequest\"\"\"
    requester_name = serializers.CharField(source='requester.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CaseActionRequest
        fields = [
            'id', 'case', 'requester', 'requester_name', 
            'action_description', 'due_date', 'status', 
            'status_display', 'response_text', 'response_at', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'requester', 'created_at', 'updated_at', 'response_at']
"""
    if 'class CaseActionRequestSerializer' not in content:
        content += serializer_code
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {path}")

if __name__ == "__main__":
    append_model()
    append_serializer()
