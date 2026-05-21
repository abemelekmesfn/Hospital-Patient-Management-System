import re

from django.db import models
from patients.models import Patient
from datetime import datetime

class Visit(models.Model):

    STATUS_CHOICES = (
        ('WAITING_RECEPTION', 'Waiting Reception'),
        ('WAITING_DOCTOR', 'Waiting Doctor'),
        ('IN_CONSULTATION', 'In Consultation'),
        ("WAITING_LAB_RESULTS", "Waiting Lab Results"),
        ("LAB_RESULTS_READY", "Lab Results Ready"),
        ("WAITING_PHARMACY", "Waiting Pharmacy"),
        ("CONSULTATION_COMPLETED", "Consultation Completed"),
        ("ADMITTED", "Admitted"),
        ("DISCHARGED", "Discharged"),
    )

    ARRIVAL_MODE = (
        ('POLICE', 'Police'),
        ('EMS', 'EMS'),
        ('TAXI', 'Taxi'),
        ('PRIVATE', 'Private'),
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="visits"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="WAITING_RECEPTION"
    )

    arrival_mode = models.CharField(
        max_length=20,
        choices=ARRIVAL_MODE,
        null=True,
        blank=True
    )

    arrival_time = models.DateTimeField(
        auto_now_add=True
    )

    registration_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    doctor = models.ForeignKey(
        "users.User",   # Your custom user model
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_visits",
        help_text="Doctor currently handling this visit"
    )

    # 2. Admission status
    is_admitted = models.BooleanField(
        default=False,
        help_text="If True, the patient is admitted to a bed and stays in ongoing care"
    )

    def __str__(self):
        return f"Visit {self.id} - {self.patient}"

    @classmethod
    def allocate_next_registration_number(cls, year=None):
        """
        Next REG-{year}-{seq} where seq is one greater than the max existing
        suffix for that year. Avoids duplicates from ordering by id or string sort.
        """
        year = year or datetime.now().year
        prefix = f"REG-{year}-"
        qs = (
            cls.objects.filter(registration_number__startswith=prefix)
            .exclude(registration_number__isnull=True)
            .exclude(registration_number="")
        )
        max_seq = 0
        pat = re.compile(rf"^{re.escape(prefix)}(\d+)$")
        for reg in qs.values_list("registration_number", flat=True):
            m = pat.match(reg or "")
            if m:
                max_seq = max(max_seq, int(m.group(1)))
        return f"{prefix}{str(max_seq + 1).zfill(4)}"

    def save(self, *args, **kwargs):

        if not self.registration_number and self.status == "WAITING_DOCTOR":
            self.registration_number = self.allocate_next_registration_number()

        super().save(*args, **kwargs)

class NextOfKin(models.Model):

    RELATIONSHIP_CHOICES = (
        ('SPOUSE', 'Spouse'),
        ('PARENT', 'Parent'),
        ('SIBLING', 'Sibling'),
        ('OTHER', 'Other'),
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="next_of_kin"
    )

    name = models.CharField(max_length=255)

    relationship = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES
    )

    phone = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.name} - {self.patient}"

class Triage(models.Model):

    patient = models.ForeignKey(
        Patient,
        on_delete=models.SET_NULL,
        null=True,  # Important for Unknown / Quick Add
        blank=True
    )
    # pulse = models.IntegerField(null=True, blank=True)
    # bp_systolic = models.IntegerField(null=True, blank=True)
    # bp_diastolic = models.IntegerField(null=True, blank=True)
    # rr = models.IntegerField(null=True, blank=True)
    # spo2 = models.IntegerField(null=True, blank=True)
    # temp = models.FloatField(null=True, blank=True)
    # triage_category = models.CharField(max_length=50, null=True, blank=True)
    # arrival_time = models.DateTimeField(auto_now_add=True)

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

    triage_patient_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Name entered at triage (before formal registration)",
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Triage for Visit {self.visit.id}"