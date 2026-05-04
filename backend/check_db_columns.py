import os
import django
import sys

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from django.db import connection
from django.db import models

def check_empty_columns():
    print("Analyzing database tables for empty columns...\n")
    
    for model in apps.get_models():
        model_name = model.__name__
        app_label = model._meta.app_label
        table_name = model._meta.db_table
        
        # Skip system tables
        if app_label in ['admin', 'auth', 'contenttypes', 'sessions', 'messages', 'staticfiles']:
            continue
            
        print(f"Table: {table_name} ({app_label}.{model_name})")
        
        # Count total rows
        total_rows = model.objects.count()
        if total_rows == 0:
            print(f"  [EMPTY TABLE] - No records found.\n")
            continue
            
        empty_cols = []
        for field in model._meta.fields:
            field_name = field.name
            
            # Count non-null values
            base_qs = model.objects.filter(**{f"{field_name}__isnull": False})
            
            # For string fields, also exclude empty strings
            if isinstance(field, (models.CharField, models.TextField)):
                count = base_qs.exclude(**{f"{field_name}": ""}).count()
            else:
                count = base_qs.count()
            
            if count == 0:
                empty_cols.append(field_name)
        
        if empty_cols:
            print(f"  Found {len(empty_cols)} empty/null columns: {', '.join(empty_cols)}")
        else:
            print(f"  All columns have data.")
        print()

if __name__ == "__main__":
    check_empty_columns()
