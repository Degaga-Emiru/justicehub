from django.db import models

class CaseStatus:
    PENDING_REVIEW = 'PENDING_REVIEW'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    PAID = 'PAID'
    ASSIGNED = 'ASSIGNED'
    IN_PROGRESS = 'IN_PROGRESS'
    CLOSED = 'CLOSED'
    
    CHOICES = [
        (PENDING_REVIEW, 'Pending Review'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (PAID, 'Paid'),
        (ASSIGNED, 'Assigned'),
        (IN_PROGRESS, 'In Progress'),
        (CLOSED, 'Closed'),
    ]
    
    @classmethod
    def get_active_statuses(cls):
        return [cls.ASSIGNED, cls.IN_PROGRESS]
    
    @classmethod
    def get_closed_statuses(cls):
        return [cls.CLOSED, cls.REJECTED]


class CasePriority:
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    URGENT = 'URGENT'
    
    CHOICES = [
        (LOW, 'Low'),
        (MEDIUM, 'Medium'),
        (HIGH, 'High'),
        (URGENT, 'Urgent'),
    ]


class DocumentType:
    PETITION = 'PETITION'
    EVIDENCE = 'EVIDENCE'
    AFFIDAVIT = 'AFFIDAVIT'
    ORDER = 'ORDER'
    JUDGMENT = 'JUDGMENT'
    OTHER = 'OTHER'
    
    CHOICES = [
        (PETITION, 'Petition'),
        (EVIDENCE, 'Evidence'),
        (AFFIDAVIT, 'Affidavit'),
        (ORDER, 'Court Order'),
        (JUDGMENT, 'Judgment'),
        (OTHER, 'Other'),
    ]