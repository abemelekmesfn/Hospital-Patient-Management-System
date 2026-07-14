from rest_framework import serializers
from triage.models import Visit
from patients.serializers import PatientSerializer
from doctor.models import Consultation, Prescription, LabOrder, NurseTask, Admission, PhysicalExamination
from nurse.serializers import NurseObservationSerializer


class AdmissionSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    
    class Meta:
        model = Admission
        fields = "__all__"

class PhysicalExaminationSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.username", read_only=True)
    
    class Meta:
        model = PhysicalExamination
        fields = "__all__"

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
            "is_admitted",
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
    assigned_nurse = serializers.SerializerMethodField()

    class Meta:
        model = NurseTask
        fields = [
            "id",
            "task_description",
            "status",
            "assigned_nurse"
        ]

    def get_assigned_nurse(self, obj):
        if not obj.assigned_nurse:
            return None
        return {
            "id": obj.assigned_nurse.id,
            "name": f"{obj.assigned_nurse.first_name} {obj.assigned_nurse.last_name}".strip() or obj.assigned_nurse.username
        }


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
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    lab_orders = LabOrderSerializer(many=True, read_only=True)
    nurse_tasks = NurseTaskSerializer(many=True, read_only=True)
    nurse_observations = NurseObservationSerializer(many=True, read_only=True)
    admission = serializers.SerializerMethodField()
    physical_examinations = PhysicalExaminationSerializer(many=True, read_only=True)

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
            "nurse_observations",
            "status",
            "doctor",
            "doctor_name",
            "is_admitted",
            "admission",
            "physical_examinations",

            "patient_name",
        ]

    def get_triage_priority(self, obj):
        if hasattr(obj, "triage"):
            return obj.triage.priority
        return None

    def get_chief_complaint(self, obj):
        if hasattr(obj, "triage"):
            return obj.triage.chief_complaint
        return None

    def get_temperature(self, obj):
        if hasattr(obj, "triage"):
            return obj.triage.temperature
        return None

    def get_blood_pressure(self, obj):
        if hasattr(obj, "triage"):
            return obj.triage.blood_pressure
        return None

    def get_pulse(self, obj):
        if hasattr(obj, "triage"):
            return obj.triage.pulse
        return None

    def get_respiratory_rate(self, obj):
        if hasattr(obj, "triage"):
            return obj.triage.respiratory_rate
        return None
    
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

    def get_admission(self, obj):
        try:
            admission = obj.admission
        except Admission.DoesNotExist:
            return None
        return AdmissionSerializer(admission).data

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

        from billing.services import create_lab_charge

        create_lab_charge(lab_order)

        return lab_order

class CompleteEncounterSerializer(serializers.Serializer):

    visit_id = serializers.IntegerField()

    def save(self):

        visit_id = self.validated_data["visit_id"]

        visit = Visit.objects.get(id=visit_id)

        pending_or_processing_labs_exist = visit.lab_orders.filter(status__in=["PENDING", "PROCESSING"]).exists()
        pending_lab_charges = visit.billing_charges.filter(stage="LAB", status="PENDING").exists()

        if pending_lab_charges:
            visit.status = "WAITING_CASHIER"
        elif pending_or_processing_labs_exist:
            visit.status = "WAITING_LAB_RESULTS"
        else:
            visit.status = "WAITING_PHARMACY" if visit.prescriptions.filter(pharmacy_status="PENDING").exists() else "CONSULTATION_COMPLETED"

        visit.save()

        return visit