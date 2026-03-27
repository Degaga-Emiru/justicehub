
import os

def fix_models():
    path = r'c:\Users\HP\justicehub\backend\cases\models.py'
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the last good line (CaseNotes __str__)
    last_good_idx = -1
    for i, line in enumerate(lines):
        if 'return f"{self.title} - {self.case.file_number}"' in line:
            last_good_idx = i
            break
    
    if last_good_idx != -1:
        new_lines = lines[:last_good_idx+1]
        new_lines.append('\n\nclass CaseActionRequest(models.Model):\n')
        new_lines.append('    """Formal requests for action from the judge or registrar to the defendant"""\n')
        new_lines.append('    class ActionStatus(models.TextChoices):\n')
        new_lines.append('        PENDING = "PENDING", "Pending"\n')
        new_lines.append('        COMPLETED = "COMPLETED", "Completed"\n')
        new_lines.append('        OVERDUE = "OVERDUE", "Overdue"\n\n')
        new_lines.append('    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)\n')
        new_lines.append('    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="action_requests")\n')
        new_lines.append('    requester = models.ForeignKey(User, on_delete=models.PROTECT, related_name="actions_requested")\n\n')
        new_lines.append('    action_description = models.TextField()\n')
        new_lines.append('    due_date = models.DateTimeField(null=True, blank=True)\n')
        new_lines.append('    status = models.CharField(\n')
        new_lines.append('        max_length=20,\n')
        new_lines.append('        choices=ActionStatus.choices,\n')
        new_lines.append('        default=ActionStatus.PENDING\n')
        new_lines.append('    )\n\n')
        new_lines.append('    response_text = models.TextField(blank=True, null=True)\n')
        new_lines.append('    response_at = models.DateTimeField(null=True, blank=True)\n\n')
        new_lines.append('    created_at = models.DateTimeField(auto_now_add=True)\n')
        new_lines.append('    updated_at = models.DateTimeField(auto_now=True)\n\n')
        new_lines.append('    class Meta:\n')
        new_lines.append('        ordering = ["-created_at"]\n')
        new_lines.append('        verbose_name = "Case Action Request"\n')
        new_lines.append('        verbose_name_plural = "Case Action Requests"\n\n')
        new_lines.append('    def __str__(self):\n')
        new_lines.append('        return f"Action for {self.case.file_number} - {self.status}"\n')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("Fixed models.py")

def fix_serializers():
    path = r'c:\Users\HP\justicehub\backend\cases\serializers.py'
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the last good line (validate_file return)
    last_good_idx = -1
    for i, line in enumerate(lines):
        if 'return value' in line and 'def validate_file' in lines[i-6]:
            last_good_idx = i
            break
    
    if last_good_idx != -1:
        new_lines = lines[:last_good_idx+1]
        new_lines.append('\n\nclass CaseActionRequestSerializer(serializers.ModelSerializer):\n')
        new_lines.append('    """Serializer for CaseActionRequest"""\n')
        new_lines.append('    requester_name = serializers.CharField(source="requester.get_full_name", read_only=True)\n')
        new_lines.append('    status_display = serializers.CharField(source="get_status_display", read_only=True)\n\n')
        new_lines.append('    class Meta:\n')
        new_lines.append('        model = CaseActionRequest\n')
        new_lines.append('        fields = [\n')
        new_lines.append('            "id", "case", "requester", "requester_name", \n')
        new_lines.append('            "action_description", "due_date", "status", \n')
        new_lines.append('            "status_display", "response_text", "response_at", \n')
        new_lines.append('            "created_at", "updated_at"\n')
        new_lines.append('        ]\n')
        new_lines.append('        read_only_fields = ["id", "requester", "created_at", "updated_at", "response_at"]\n')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("Fixed serializers.py")

if __name__ == "__main__":
    fix_models()
    fix_serializers()
