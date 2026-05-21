from rest_framework import serializers
from doctor.models import NurseTask

class NurseTaskSerializer(serializers.ModelSerializer):

    patient_name = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    visit_id = serializers.IntegerField(source="visit.id", read_only=True)

    class Meta:
        model = NurseTask
        fields = [
            "id",
            "visit_id",
            "patient_name",
            "task_description",
            "status",
            "priority",
            "created_at",
            "completed_at",
        ]

    def get_patient_name(self, obj):
        first = obj.visit.patient.first_name or ""
        last = obj.visit.patient.last_name or ""
        return f"{first} {last}".strip()

    def get_priority(self, obj):
        triage = getattr(obj.visit, "triage", None)
        return triage.priority if triage else None