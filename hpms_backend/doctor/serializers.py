from rest_framework import serializers
from triage.models import Visit
from patients.serializers import PatientSerializer
from doctor.models import Consultation, Prescription, LabOrder, NurseTask

class DoctorQueueSerializer(serializers.ModelSerializer):

    hospital_id = serializers.CharField(source="patient.hospital_id")
    name = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    chief_complaint = serializers.SerializerMethodField()
    status = serializers.CharField()

    class Meta:
        model = Visit
        fields = [
            "id",
            "hospital_id",
            "name",
            "priority",
            "chief_complaint",
            "arrival_time",
            "status",
        ]

    def get_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_priority(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.priority if triage else None

    def get_chief_complaint(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.chief_complaint if triage else None

class PrescriptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Prescription
        fields = [
            "id",
            "drug_name",
            "dosage",
            "frequency",
            "duration",
        ]


class LabOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = LabOrder
        fields = [
            "id",
            "test_name",
            "status",
            "result",
            "completed_at",
            "doctor_lab_toast_dismissed",
            "doctor_lab_result_modal_seen",
        ]


class NurseTaskSerializer(serializers.ModelSerializer):

    class Meta:
        model = NurseTask
        fields = [
            "id",
            "task_description",
            "status",
        ]


class ConsultationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Consultation
        fields = [
            "chief_complaint",
            "physical_exam",
            "diagnosis",
        ]

class DoctorVisitSerializer(serializers.ModelSerializer):

    patient = PatientSerializer()
    consultation = serializers.SerializerMethodField()
    prescriptions = PrescriptionSerializer(many=True)
    lab_orders = LabOrderSerializer(many=True)
    nurse_tasks = NurseTaskSerializer(many=True)

    triage_priority = serializers.SerializerMethodField()
    chief_complaint = serializers.SerializerMethodField()
    temperature = serializers.SerializerMethodField()
    blood_pressure = serializers.SerializerMethodField()
    pulse = serializers.SerializerMethodField()
    respiratory_rate = serializers.SerializerMethodField()

    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    class Meta:
        model = Visit
        fields = [
            "id",
            "arrival_time",
            "arrival_mode",
            "patient",

            "triage_priority",
            "chief_complaint",
            "temperature",
            "blood_pressure",
            "pulse",
            "respiratory_rate",

            "consultation",
            "prescriptions",
            "lab_orders",
            "nurse_tasks",
            "status",
            "doctor",
            "doctor_name",
            "is_admitted",

            "patient_name",
        ]

    def get_triage_priority(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.priority if triage else None

    def get_chief_complaint(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.chief_complaint if triage else None

    def get_temperature(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.temperature if triage else None

    def get_blood_pressure(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.blood_pressure if triage else None

    def get_pulse(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.pulse if triage else None

    def get_respiratory_rate(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.respiratory_rate if triage else None
    
    def get_doctor_name(self, obj):
        if not obj.doctor:
            return None
        return f"{obj.doctor.first_name} {obj.doctor.last_name}"
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_consultation(self, obj):
        try:
            consultation = obj.consultation
        except Consultation.DoesNotExist:
            return None
        return ConsultationSerializer(consultation).data

class SaveConsultationSerializer(serializers.ModelSerializer):

    visit_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Consultation
        fields = [
            "visit_id",
            "chief_complaint",
            "physical_exam",
            "diagnosis",
        ]

    def create(self, validated_data):

        visit_id = validated_data.pop("visit_id")

        consultation, created = Consultation.objects.update_or_create(
            visit_id=visit_id,
            defaults=validated_data
        )

        return consultation

class CreateNurseTaskSerializer(serializers.ModelSerializer):

    visit_id = serializers.IntegerField(write_only=True)
    patient_name = serializers.SerializerMethodField()
    class Meta:
        model = NurseTask
        fields = [
            "id",
            "visit_id",
            "task_description",
            "status",
            "assigned_nurse",
            "patient_name",
        ]
    
    def get_patient_name(self, obj):
        return f"{obj.visit.patient.first_name} {obj.visit.patient.last_name}"

    def create(self, validated_data):

        visit_id = validated_data.pop("visit_id")

        task = NurseTask.objects.create(
            visit_id=visit_id,
            task_description=validated_data["task_description"],
            status="PENDING"
        )

        return task

class CreatePrescriptionSerializer(serializers.ModelSerializer):

    visit_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Prescription
        fields = [
            "visit_id",
            "drug_name",
            "dosage",
            "frequency",
            "duration"
        ]

    def create(self, validated_data):

        visit_id = validated_data.pop("visit_id")
        doctor = validated_data.pop("doctor", None)

        prescription = Prescription.objects.create(
            visit_id=visit_id,
            doctor=doctor,
            drug_name=validated_data["drug_name"],
            dosage=validated_data["dosage"],
            frequency=validated_data["frequency"],
            duration=validated_data["duration"],
            pharmacy_status="PENDING",
        )

        return prescription

class CreateLabOrderSerializer(serializers.ModelSerializer):

    visit_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = LabOrder
        fields = [
            "visit_id",
            "test_name"
        ]

    def create(self, validated_data):

        visit_id = validated_data.pop("visit_id")

        lab_order = LabOrder.objects.create(
            visit_id=visit_id,
            test_name=validated_data["test_name"],
            status="PENDING",
        )

        return lab_order

class CompleteEncounterSerializer(serializers.Serializer):

    visit_id = serializers.IntegerField()

    def save(self):

        visit_id = self.validated_data["visit_id"]

        visit = Visit.objects.get(id=visit_id)

        lab_orders_exist = visit.lab_orders.exists()

        if lab_orders_exist:
            visit.status = "WAITING_LAB_RESULTS"
        else:
            visit.status = "CONSULTATION_COMPLETED"

        visit.save()

        return visit