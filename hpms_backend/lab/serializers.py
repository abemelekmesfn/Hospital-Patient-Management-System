from rest_framework import serializers

from doctor.models import LabOrder


class LabQueueSerializer(serializers.ModelSerializer):
    """Queue items use doctor-ordered lab tests (same model as /doctor/lab-order/)."""

    patient_name = serializers.SerializerMethodField()
    test = serializers.CharField(source="test_name", read_only=True)
    priority = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = ["id", "patient_name", "test", "status", "priority"]

    def get_patient_name(self, obj):
        p = obj.visit.patient
        return f"{p.first_name} {p.last_name}".strip()

    def get_priority(self, obj):
        triage = getattr(obj.visit, "triage", None)
        return triage.priority if triage else None


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabOrder
        fields = ["result", "status"]