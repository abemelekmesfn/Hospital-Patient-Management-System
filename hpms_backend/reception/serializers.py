from rest_framework import serializers
from triage.models import Visit
from patients.serializers import PatientSerializer
from patients.models import Patient
from .models import NextOfKin
from django.utils import timezone
from triage.models import Triage

class ReceptionQueueSerializer(serializers.ModelSerializer):


    hospital_id = serializers.CharField(source="patient.hospital_id")
    name = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    chief_complaint = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = [
            "id",
            "hospital_id",
            "name",
            "priority",
            "chief_complaint",
            "arrival_time",
        ]

    def get_name(self, obj):
        triage = getattr(obj, "triage", None)
        if triage and (triage.triage_patient_name or "").strip():
            return triage.triage_patient_name.strip()
        fn = (obj.patient.first_name or "").strip()
        ln = (obj.patient.last_name or "").strip()
        return f"{fn} {ln}".strip() or "UNKNOWN"

    def get_priority(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.priority if triage else None

    def get_chief_complaint(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.chief_complaint if triage else None

class VisitDetailSerializer(serializers.ModelSerializer):


    patient = PatientSerializer()
    triage_priority = serializers.SerializerMethodField()
    chief_complaint = serializers.SerializerMethodField()
    temperature = serializers.SerializerMethodField()
    blood_pressure = serializers.SerializerMethodField()
    pulse = serializers.SerializerMethodField()
    respiratory_rate = serializers.SerializerMethodField()
    triage_id = serializers.SerializerMethodField()
    triage_patient_name = serializers.SerializerMethodField()

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
            "triage_id",
            "triage_patient_name",
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

    def get_triage_id(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.id if triage else None

    def get_triage_patient_name(self, obj):
        triage = getattr(obj, "triage", None)
        return (triage.triage_patient_name or "").strip() if triage else ""

    def create(self, validated_data):
        triage = Triage.objects.get(id=validated_data["triage_id"])

        # Ensure patient exists
        if triage.patient:
            patient = triage.patient
        else:
            patient = Patient.objects.create(
                last_name=validated_data.get("last_name", ""),
                phone=validated_data.get("phone", ""),
                address=validated_data.get("address", ""),
                date_of_birth=validated_data.get("date_of_birth", None),
            )
            triage.patient = patient
            triage.save()

        # Update patient info if available
        patient.first_name = validated_data.get("first_name", patient.first_name)
        patient.last_name = validated_data.get("last_name", patient.last_name)
        patient.phone = validated_data.get("phone", patient.phone)
        patient.address = validated_data.get("address", patient.address)
        patient.date_of_birth = validated_data.get("date_of_birth", patient.date_of_birth)
        patient.save()

        # Generate registration number (reset yearly)
        year = timezone.now().year
        last_visit = Visit.objects.filter(registration_number__startswith=f"REG-{year}").order_by("-id").first()
        new_number = int(last_visit.registration_number.split("-")[-1]) + 1 if last_visit else 1
        registration_number = f"REG-{year}-{str(new_number).zfill(4)}"

        # Create visit (do NOT pass triage)
        visit = Visit.objects.create(
            patient=patient,
            arrival_mode=validated_data["arrival_mode"],
            registration_number=registration_number
        )

        # Update triage to point to visit
        triage.visit = visit
        triage.save()

        # Save next of kin
        if validated_data.get("kin_name"):
            NextOfKin.objects.create(
                visit=visit,
                name=validated_data["kin_name"],
                phone=validated_data.get("kin_phone"),
                relationship=validated_data.get("kin_relationship")
            )

        return visit



class FinalizeRegistrationSerializer(serializers.ModelSerializer):
    # Fields from Triage/Patient that receptionist can update
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(write_only=True, required=False)
    
    # Arrival mode and triage ID from the frontend
    arrival_mode = serializers.CharField(write_only=True)
    triage_id = serializers.IntegerField(write_only=True)
    
    # Next-of-kin info
    kin_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    kin_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    kin_relationship = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Visit
        fields = [
            'first_name', 'last_name', 'phone', 'date_of_birth',
            'arrival_mode', 'triage_id',
            'kin_name', 'kin_phone', 'kin_relationship'
        ]

    def create(self, validated_data):
        # Get the triage record
        triage = Triage.objects.get(id=validated_data["triage_id"])
        
        # Get the existing visit from triage
        visit = triage.visit
        
        # Update patient info
        patient = visit.patient
        patient.first_name = validated_data.get("first_name", patient.first_name)
        patient.last_name = validated_data.get("last_name", patient.last_name)
        patient.phone = validated_data.get("phone", patient.phone)
        patient.date_of_birth = validated_data.get("date_of_birth", patient.date_of_birth)
        patient.save()

        # Update visit info
        visit.arrival_mode = validated_data["arrival_mode"]
        visit.status = "WAITING_DOCTOR"
        
        if not visit.registration_number:
            visit.registration_number = Visit.allocate_next_registration_number(
                year=timezone.now().year
            )

        visit.save()

        # Save Next of Kin if provided
        if validated_data.get("kin_name"):
            NextOfKin.objects.create(
                visit=visit,
                name=validated_data["kin_name"],
                phone=validated_data.get("kin_phone", ""),
                relationship=validated_data.get("kin_relationship", "")
            )

        return visit