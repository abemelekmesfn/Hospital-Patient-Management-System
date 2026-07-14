from rest_framework import serializers
from doctor.models import NurseTask
from .models import NurseObservation

class NurseTaskSerializer(serializers.ModelSerializer):

    patient_name = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    visit_id = serializers.IntegerField(source="visit.id", read_only=True)
    is_admitted = serializers.SerializerMethodField()
    ward_name = serializers.SerializerMethodField()
    bed_number = serializers.SerializerMethodField()
    admission_note = serializers.SerializerMethodField()

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
            "is_admitted",
            "ward_name",
            "bed_number",
            "admission_note",
        ]

    def get_patient_name(self, obj):
        first = obj.visit.patient.first_name or ""
        last = obj.visit.patient.last_name or ""
        return f"{first} {last}".strip()

    def get_priority(self, obj):
        if hasattr(obj.visit, "triage"):
            return obj.visit.triage.priority
        return None

    def get_is_admitted(self, obj):
        return obj.visit.is_admitted

    def get_ward_name(self, obj):
        if hasattr(obj.visit, 'admission') and obj.visit.admission.ward:
            return obj.visit.admission.ward.name
        return None

    def get_bed_number(self, obj):
        if hasattr(obj.visit, 'admission') and obj.visit.admission.bed:
            return obj.visit.admission.bed.bed_number
        return None

    def get_admission_note(self, obj):
        if hasattr(obj.visit, 'admission'):
            return obj.visit.admission.admission_note
        return None


class NurseObservationSerializer(serializers.ModelSerializer):
    nurse_name = serializers.SerializerMethodField()

    class Meta:
        model = NurseObservation
        fields = [
            "id",
            "visit",
            "nurse_name",
            "observation_notes",
            "vitals_snapshot",
            "commit_type",
            "committed_at",
            "doctor_seen"
        ]

    def get_nurse_name(self, obj):
        if not obj.nurse:
            return "Unknown Nurse"
        return f"{obj.nurse.first_name} {obj.nurse.last_name}".strip() or obj.nurse.username
