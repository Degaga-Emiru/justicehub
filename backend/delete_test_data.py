import os
import sys
import django
from django.db.models import Q

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from cases.models import Case, CaseCategory
from hearings.models import Hearing

def delete_test_data():
    print("Starting test data cleanup...")
    
    # 1. Identify Test Users
    # Look for emails containing 'test' or specific test emails
    test_users = User.objects.filter(
        Q(email__icontains='test') |
        Q(first_name__icontains='test') |
        Q(last_name__icontains='test')
    ).exclude(
        role='ADMIN' # Don't delete admins accidentally
    )
    
    print(f"Found {test_users.count()} test users.")
    for user in test_users:
        print(f" - Deleting User: {user.email}")
        
    # 2. Identify Test Cases
    # Look for titles or descriptions containing 'test'
    test_cases = Case.objects.filter(
        Q(title__icontains='test') |
        Q(description__icontains='test') |
        Q(created_by__in=test_users)
    )
    
    print(f"\nFound {test_cases.count()} test cases.")
    for case in test_cases:
        print(f" - Deleting Case: {case.title} ({case.file_number})")
        
    # 3. Identify Test Hearings
    test_hearings = Hearing.objects.filter(
        Q(title__icontains='test') |
        Q(case__in=test_cases)
    )
    
    print(f"\nFound {test_hearings.count()} test hearings.")
    for hearing in test_hearings:
        print(f" - Deleting Hearing: {hearing.title}")
        
    print("\nExecuting deletions...")
    
    # Delete in correct order to respect foreign keys (especially PROTECT rules)
    from payments.models import Payment, Transaction
    from decisions.models import Decision
    
    # 1. Delete associated Payments and Transactions
    test_payments = Payment.objects.filter(case__in=test_cases)
    Transaction.objects.filter(payment__in=test_payments).delete()
    test_payments.delete()
    print("Deleted related payments and transactions.")
    
    # 2. Delete associated Decisions
    test_decisions = Decision.objects.filter(case__in=test_cases)
    test_decisions.delete()
    print("Deleted related decisions.")
    
    # 3. Delete Hearings
    deleted_hearings = test_hearings.delete()
    print(f"Deleted hearings: {deleted_hearings}")
    
    # Force hard delete for soft-deleted models if they use a custom manager
    # Case uses SoftDeleteModel, so .delete() might just set is_deleted=True
    # To truly clean the DB, we need to hard delete.
    count = 0
    for case in test_cases:
        case.hard_delete()
        count += 1
    print(f"Hard deleted {count} cases.")
    
    # For Users, we also updated to use hard_delete earlier, but let's be sure.
    user_count = 0
    for user in test_users:
        try:
            user.hard_delete()
            user_count += 1
        except Exception as e:
             # Fallback to normal delete if hard_delete fails or isn't on User
             user.delete()
             user_count += 1
    print(f"Deleted {user_count} users.")
    
    print("\nCleanup complete.")

if __name__ == "__main__":
    delete_test_data()
