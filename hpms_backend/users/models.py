from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('TRIAGE', 'Triage'),
        ('RECEPTION', 'Reception'),
        ('DOCTOR', 'Doctor'),
        ('NURSE', 'Nurse'),
        ('LABORATORY', 'Laboratory'),
        ('PHARMACIST', 'Pharmacist'),
        ('CASHIER', 'Cashier'),
    )

    DEPARTMENT_CHOICES = (
        ('OPD', 'OPD (Outpatient Department)'),
        ('PED', 'PED (Pediatrics)'),
        ('OBGYN', 'OB/GYN (Obstetrics and Gynecology)'),
        ('IM', 'IM / INT MED (Internal Medicine)'),
        ('ORTHO', 'ORTHO (Orthopedics)'),
        ('CARD', 'CARD (Cardiology)'),
        ('DERM', 'DERM (Dermatology)'),
        ('ENT', 'ENT (Otolaryngology)'),
        ('OPH', 'OPH / OPHTH (Ophthalmology)'),
        ('EMERG', 'EMERG (Emergency)'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.role == "ADMIN":
            self.is_active = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} - {self.role}"