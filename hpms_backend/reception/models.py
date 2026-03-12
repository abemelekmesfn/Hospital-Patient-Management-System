from django.db import models
from triage.models import Visit


class NextOfKin(models.Model):

    visit = models.ForeignKey(
        Visit,
        on_delete=models.CASCADE,
        related_name="next_of_kin"
    )

    name = models.CharField(max_length=255)

    relationship = models.CharField(max_length=100)

    phone = models.CharField(max_length=20)

    def __str__(self):
        return self.name
