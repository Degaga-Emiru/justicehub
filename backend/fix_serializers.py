
import os

def fix_serializers():
    path = r'c:\Users\HP\justicehub\backend\cases\serializers.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add import
    if 'CaseActionRequest' not in content:
        content = content.replace('CaseStatus', 'CaseStatus, CaseActionRequest')
    
    # Add serializer at the end
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
    if 'CaseActionRequestSerializer' not in content:
        content += serializer_code
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {path}")

if __name__ == "__main__":
    fix_serializers()
