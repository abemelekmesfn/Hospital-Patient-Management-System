from rest_framework import serializers
from triage.models import Visit
from patients.serializers import PatientSerializer
from patients.models import Patient
from .models import NextOfKin
from django.utils import timezone
from triage.models import Triage

class ReceptionQueueSerializer(serializers.ModelSerializer):

    # Original fields (commented for rollback)
    # hospital_id = serializers.CharField(source="patient.hospital_id")
    # name = serializers.SerializerMethodField()
    # priority = serializers.CharField(source="triage.priority")
    # chief_complaint = serializers.CharField(source="triage.chief_complaint")

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
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_priority(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.priority if triage else None

    def get_chief_complaint(self, obj):
        triage = getattr(obj, "triage", None)
        return triage.chief_complaint if triage else None

class VisitDetailSerializer(serializers.ModelSerializer):

    # Original fields (commented for rollback)
    # patient = PatientSerializer()
    # triage_priority = serializers.CharField(source="triage.priority")
    # chief_complaint = serializers.CharField(source="triage.chief_complaint")
    # temperature = serializers.DecimalField(
    #     source="triage.temperature",
    #     max_digits=4,
    #     decimal_places=1
    # )
    # blood_pressure = serializers.CharField(source="triage.blood_pressure")
    # pulse = serializers.IntegerField(source="triage.pulse")
    # respiratory_rate = serializers.IntegerField(source="triage.respiratory_rate")

    patient = PatientSerializer()
    triage_priority = serializers.SerializerMethodField()
    chief_complaint = serializers.SerializerMethodField()
    temperature = serializers.SerializerMethodField()
    blood_pressure = serializers.SerializerMethodField()
    pulse = serializers.SerializerMethodField()
    respiratory_rate = serializers.SerializerMethodField()

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
    # class FinalizeRegistrationSerializer(serializers.Serializer):

#     triage_id = serializers.IntegerField()

#     # Patient data
#     first_name = serializers.CharField()
        # Removed create method from VisitDetailSerializer. Visit creation logic is only in FinalizeRegistrationSerializer.

#         # Create visit
#         visit = Visit.objects.create(
#             patient=patient,
#             triage=triage,
#             arrival_mode=validated_data["arrival_mode"],
#             registration_number=registration_number
#         )

#         # Save next of kin
#         if validated_data.get("kin_name"):
#             NextOfKin.objects.create(
#                 visit=visit,
#                 name=validated_data["kin_name"],
#                 phone=validated_data.get("kin_phone"),
#                 relationship=validated_data.get("kin_relationship")
#             )

#         return visit


# class FinalizeRegistrationSerializer(serializers.ModelSerializer):
#     triage_id = serializers.IntegerField(write_only=True)
#     kin_name = serializers.CharField(write_only=True, required=False)
#     kin_phone = serializers.CharField(write_only=True, required=False)
#     kin_relationship = serializers.CharField(write_only=True, required=False)

#     class Meta:
#         model = Visit
#         fields = [
#             "triage_id", "first_name", "last_name", "phone",
#             "address", "date_of_birth", "arrival_mode",
#             "kin_name", "kin_phone", "kin_relationship"
#         ]

    # Original create method (commented for rollback)
    # def create(self, validated_data):
    #     triage = Triage.objects.get(id=validated_data["triage_id"])
    #
    #     # Step 1: Ensure patient exists
    #     if triage.patient:
    #         patient = triage.patient
    #     else:
    #         # Create a new patient for Quick Add / Unknown
    #         patient = Patient.objects.create(
    #             last_name=validated_data.get("last_name", ""),
    #             phone=validated_data.get("phone", ""),
    #             address=validated_data.get("address", ""),
    #             date_of_birth=validated_data.get("date_of_birth", None),
    #         )
    #         triage.patient = patient
    #         triage.save()
    #
    #     # Step 2: Update patient info if available
    #     patient.first_name = validated_data.get("first_name", patient.first_name)
    #     patient.last_name = validated_data.get("last_name", patient.last_name)
    #     patient.phone = validated_data.get("phone", patient.phone)
    #     patient.address = validated_data.get("address", patient.address)
    #     patient.date_of_birth = validated_data.get("date_of_birth", patient.date_of_birth)
    #     patient.save()
    #
    #     # Step 3: Generate registration number (reset yearly)
    #     year = timezone.now().year
    #     last_visit = Visit.objects.filter(registration_number__startswith=f"REG-{year}").order_by("-id").first()
    #     new_number = int(last_visit.registration_number.split("-")[-1]) + 1 if last_visit else 1
    #     registration_number = f"REG-{year}-{str(new_number).zfill(4)}"
    #
    #     # Step 4: Create visit
    #     visit = Visit.objects.create(
    #         patient=patient,
    #         triage=triage,
    #         arrival_mode=validated_data["arrival_mode"],
    #         registration_number=registration_number
    #     )
    #
    #     # Step 5: Save next of kin
    #     if validated_data.get("kin_name"):
    #         NextOfKin.objects.create(
    #             visit=visit,
    #             name=validated_data["kin_name"],
    #             phone=validated_data.get("kin_phone"),
    #             relationship=validated_data.get("kin_relationship")
    #         )
    #
    #     return visit

    def create(self, validated_data):
        triage = Triage.objects.get(id=validated_data["triage_id"])

        # Step 1: Ensure patient exists
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

        # Step 2: Update patient info if available
        patient.first_name = validated_data.get("first_name", patient.first_name)
        patient.last_name = validated_data.get("last_name", patient.last_name)
        patient.phone = validated_data.get("phone", patient.phone)
        patient.address = validated_data.get("address", patient.address)
        patient.date_of_birth = validated_data.get("date_of_birth", patient.date_of_birth)
        patient.save()

        # Step 3: Generate registration number (reset yearly)
        year = timezone.now().year
        last_visit = Visit.objects.filter(registration_number__startswith=f"REG-{year}").order_by("-id").first()
        new_number = int(last_visit.registration_number.split("-")[-1]) + 1 if last_visit else 1
        registration_number = f"REG-{year}-{str(new_number).zfill(4)}"

        # Step 4: Create visit (do NOT pass triage)
        visit = Visit.objects.create(
            patient=patient,
            arrival_mode=validated_data["arrival_mode"],
            registration_number=registration_number
        )

        # Step 5: Update triage to point to visit
        triage.visit = visit
        triage.save()

        # Step 6: Save next of kin
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
    last_name = serializers.CharField(write_only=True)
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
        # 1️⃣ Get the triage record
        triage = Triage.objects.get(id=validated_data["triage_id"])
        
        # 2️⃣ Get or create patient (link triage to patient)
        patient = triage.patient

        # 3️⃣ Update patient info
        patient.first_name = validated_data.get("first_name", patient.first_name)
        patient.last_name = validated_data.get("last_name", patient.last_name)
        patient.phone = validated_data.get("phone", patient.phone)
        patient.date_of_birth = validated_data.get("date_of_birth", patient.date_of_birth)
        patient.save()

        # 4️⃣ Generate registration number (reset every year)
        year = timezone.now().year
        last_visit = Visit.objects.filter(
            registration_number__startswith=f"REG-{year}"
        ).order_by("-id").first()
        new_number = 1
        if last_visit:
            last_number = int(last_visit.registration_number.split("-")[-1])
            new_number = last_number + 1
        registration_number = f"REG-{year}-{str(new_number).zfill(4)}"

        # 5️⃣ Create Visit (link triage)
        # Original (commented for rollback):
        # visit = Visit.objects.create(
        #     patient=patient,
        #     triage=triage,
        #     arrival_mode=validated_data["arrival_mode"],
        #     registration_number=registration_number
        # )

        visit = Visit.objects.create(
            patient=patient,
            arrival_mode=validated_data["arrival_mode"],
            registration_number=registration_number
        )

        # Link triage to visit
        triage.visit = visit
        triage.save()

        # 6️⃣ Save Next of Kin if provided
        if validated_data.get("kin_name"):
            NextOfKin.objects.create(
                visit=visit,
                name=validated_data["kin_name"],
                phone=validated_data.get("kin_phone", ""),
                relationship=validated_data.get("kin_relationship", "")
            )

        return visit