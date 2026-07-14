from django.db import models
from triage.models import Visit
from users.models import User

class NurseTask(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
    ]

    visit = models.ForeignKey(
        Visit,
        on_delete=models.CASCADE,
        related_name="nurse_queue_tasks",
    )

    task = models.CharField(max_length=255)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.visit} - {self.task}"

class NurseObservation(models.Model):
    COMMIT_TYPE_CHOICES = [
        ("NOTES", "Notes"),
        ("VITALS", "Vitals"),
    ]

    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="nurse_observations")
    nurse = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'NURSE'})
    
    observation_notes = models.TextField(blank=True, default="")
    vitals_snapshot = models.JSONField(blank=True, null=True)
    
    commit_type = models.CharField(max_length=20, choices=COMMIT_TYPE_CHOICES)
    committed_at = models.DateTimeField(auto_now_add=True)
    doctor_seen = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.commit_type} for Visit {self.visit_id}"
