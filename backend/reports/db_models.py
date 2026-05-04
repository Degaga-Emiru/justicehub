from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class CaseCategory(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=100)
    fee = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'cases_casecategory'

class Case(models.Model):
    id = models.UUIDField(primary_key=True)
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20)
    payment_status = models.CharField(max_length=20)
    priority = models.CharField(max_length=20)
    category = models.ForeignKey(CaseCategory, on_delete=models.DO_NOTHING, related_name='+')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    closed_date = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+')
    plaintiff = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'cases_case'

class JudgeAssignment(models.Model):
    id = models.UUIDField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING, related_name='+')
    judge = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+')
    is_active = models.BooleanField()
    assigned_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'cases_judgeassignment'

class Payment(models.Model):
    id = models.UUIDField(primary_key=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING, related_name='+')
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'payments_payment'

class Hearing(models.Model):
    id = models.UUIDField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING, related_name='+')
    judge = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+')
    status = models.CharField(max_length=20)
    scheduled_date = models.DateTimeField()
    duration_minutes = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'hearings_hearing'

class HearingParticipant(models.Model):
    id = models.UUIDField(primary_key=True)
    hearing = models.ForeignKey(Hearing, on_delete=models.DO_NOTHING, related_name='+')
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+')
    attendance_status = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = 'hearings_hearingparticipant'

class Decision(models.Model):
    id = models.UUIDField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.DO_NOTHING, related_name='+')
    judge = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='+')
    status = models.CharField(max_length=20)
    decision_type = models.CharField(max_length=20)
    immediate_reason = models.CharField(max_length=20, null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'decisions_decision'
