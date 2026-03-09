from rest_framework import serializers
from .models import Triage


class TriageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Triage
        fields = [
            "temperature",
            "blood_pressure",
            "pulse",
            "respiratory_rate",
            "chief_complaint",
            "priority"
        ]