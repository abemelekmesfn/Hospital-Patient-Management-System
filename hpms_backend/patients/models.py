from django.db import models


class Patient(models.Model):

    SEX_CHOICES = (
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    )

    hospital_id = models.CharField(max_length=20, unique=True, blank=True)

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)

    sex = models.CharField(max_length=10, choices=SEX_CHOICES)

    date_of_birth = models.DateField(null=True, blank=True)

    phone = models.CharField(max_length=20, blank=True)

    is_unknown = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):

        if not self.hospital_id:
            last_patient = Patient.objects.order_by('id').last()

            if last_patient:
                last_id = last_patient.id + 1
            else:
                last_id = 1

            self.hospital_id = f"HPMS-{last_id:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"