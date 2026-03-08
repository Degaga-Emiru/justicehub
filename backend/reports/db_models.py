from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class CaseCategory(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=100)
    fee = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'cases_casecategory'

class Case(models.Model):
    id = models.UUIDField(primary_key=True)
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20)
    priority = models.CharField(max_length=20)
    category = models.ForeignKey(CaseCategory, on_delete=models.DO_NOTHING)
    main_issue = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField()
    closed_date = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='created_cases')

    class Meta:
        managed = False
        db_table = 'cases_case'

class JudgeAssignment(models.Model):
    id = models.UUIDField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING)
    judge = models.ForeignKey(User, on_delete=models.DO_NOTHING)
    is_active = models.BooleanField()
    assigned_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'cases_judgeassignment'

class Payment(models.Model):
    id = models.UUIDField(primary_key=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING)
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING)
    transaction_date = models.DateField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'payments_payment'

class Hearing(models.Model):
    id = models.UUIDField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING)
    judge = models.ForeignKey(User, on_delete=models.DO_NOTHING)
    status = models.CharField(max_length=20)
    scheduled_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'hearings_hearing'

class Decision(models.Model):
    id = models.UUIDField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING)
    judge = models.ForeignKey(User, on_delete=models.DO_NOTHING)
    status = models.CharField(max_length=20)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'decisions_decision'
