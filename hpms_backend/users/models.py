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

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.username} - {self.role}"