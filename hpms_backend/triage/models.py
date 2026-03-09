from django.db import models
from patients.models import Patient


class Visit(models.Model):

    STATUS_CHOICES = (
        ('WAITING_RECEPTION', 'Waiting Reception'),
        ('WAITING_DOCTOR', 'Waiting Doctor'),
        ('IN_CONSULTATION', 'In Consultation'),
        ('COMPLETED', 'Completed'),
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='visits'
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='WAITING_RECEPTION'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Visit {self.id} - {self.patient}"

class Triage(models.Model):

    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('URGENT', 'Urgent'),
        ('CRITICAL', 'Critical'),
    )

    visit = models.OneToOneField(
        Visit,
        on_delete=models.CASCADE,
        related_name='triage'
    )

    temperature = models.DecimalField(max_digits=4, decimal_places=1)
    blood_pressure = models.CharField(max_length=20)
    pulse = models.IntegerField()
    respiratory_rate = models.IntegerField()

    chief_complaint = models.TextField()

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Triage for Visit {self.visit.id}"