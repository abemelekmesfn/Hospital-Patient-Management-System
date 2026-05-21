from django.db import models
from triage.models import Visit

class Prescription(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("DISPENSED", "Dispensed"),
    ]

    visit = models.ForeignKey(
        Visit,
        on_delete=models.CASCADE,
        related_name="pharmacy_prescriptions",
    )

    drug_name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50, blank=True)
    frequency = models.CharField(max_length=50, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")

    created_at = models.DateTimeField(auto_now_add=True)
    dispensed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.visit} - {self.drug_name}"
