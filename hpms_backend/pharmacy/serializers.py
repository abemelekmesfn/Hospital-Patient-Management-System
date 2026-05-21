from rest_framework import serializers

from doctor.models import Prescription


class PharmacyQueueSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            "id",
            "visit_id",
            "patient_name",
            "drug_name",
            "dosage",
            "frequency",
            "pharmacy_status",
            "priority",
        ]

    def get_patient_name(self, obj):
        p = obj.visit.patient
        return f"{p.first_name} {p.last_name}".strip()

    def get_priority(self, obj):
        triage = getattr(obj.visit, "triage", None)
        return triage.priority if triage else None
