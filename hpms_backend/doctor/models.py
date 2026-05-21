from django.db import models
from triage.models import Visit
from users.models import User


class Consultation(models.Model):

    visit = models.OneToOneField(
        Visit,
        on_delete=models.CASCADE,
        related_name="consultation"
    )

    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'doctor'}
    )

    chief_complaint = models.TextField(blank=True)
    physical_exam = models.TextField(blank=True)
    diagnosis = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Consultation - Visit {self.visit.id}"


class Prescription(models.Model):

    visit = models.ForeignKey(
        Visit,
        on_delete=models.CASCADE,
        related_name="prescriptions"
    )

    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'doctor'}
    )

    drug_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)

    PHARMACY_STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("DISPENSED", "Dispensed"),
    ]
    pharmacy_status = models.CharField(
        max_length=20,
        choices=PHARMACY_STATUS_CHOICES,
        default="PENDING",
    )
    dispensed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.drug_name


class LabOrder(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
    ]

    visit = models.ForeignKey(
        Visit,
        on_delete=models.CASCADE,
        related_name="lab_orders"
    )

    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'doctor'}
    )

    test_name = models.CharField(max_length=255)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    result = models.TextField(blank=True, default="")

    doctor_lab_toast_dismissed = models.BooleanField(default=False)
    doctor_lab_result_modal_seen = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.test_name


class NurseTask(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("DONE", "Done"),
    ]

    visit = models.ForeignKey(
        Visit,
        on_delete=models.CASCADE,
        related_name="nurse_tasks"
    )

    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'doctor'}
    )

    task_description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    assigned_nurse = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.task_description
