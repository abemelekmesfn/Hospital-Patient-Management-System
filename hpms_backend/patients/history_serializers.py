from rest_framework import serializers
from patients.serializers import PatientSerializer


class VisitTriageHistorySerializer(serializers.Serializer):
    priority = serializers.CharField(allow_null=True)
    chief_complaint = serializers.CharField(allow_blank=True)
    temperature = serializers.DecimalField(
        max_digits=6, decimal_places=1, allow_null=True
    )
    blood_pressure = serializers.CharField(allow_blank=True)
    pulse = serializers.IntegerField(allow_null=True)
    respiratory_rate = serializers.IntegerField(allow_null=True)
    triage_patient_name = serializers.CharField(allow_blank=True)
    recorded_at = serializers.DateTimeField(allow_null=True)


class VisitReceptionHistorySerializer(serializers.Serializer):
    registration_number = serializers.CharField(allow_null=True)
    arrival_mode = serializers.CharField(allow_null=True)
    arrival_time = serializers.DateTimeField()
    status = serializers.CharField()
    kin_name = serializers.CharField(allow_blank=True)
    kin_phone = serializers.CharField(allow_blank=True)
    kin_relationship = serializers.CharField(allow_blank=True)


class ConsultationHistorySerializer(serializers.Serializer):
    doctor_name = serializers.CharField(allow_blank=True)
    chief_complaint = serializers.CharField(allow_blank=True)
    physical_exam = serializers.CharField(allow_blank=True)
    diagnosis = serializers.CharField(allow_blank=True)
    examined_at = serializers.DateTimeField(allow_null=True)


class LabOrderHistorySerializer(serializers.Serializer):
    test_name = serializers.CharField()
    status = serializers.CharField()
    result = serializers.CharField(allow_blank=True)
    ordered_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)


class PrescriptionHistorySerializer(serializers.Serializer):
    drug_name = serializers.CharField()
    dosage = serializers.CharField()
    frequency = serializers.CharField()
    duration = serializers.CharField()
    pharmacy_status = serializers.CharField()
    prescribed_at = serializers.DateTimeField(allow_null=True)


class NurseTaskHistorySerializer(serializers.Serializer):
    task_description = serializers.CharField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField(allow_null=True)


class InvoiceHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    insurance_discount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    payment_method = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    items = serializers.ListField(child=serializers.DictField())


class VisitClinicalHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    registration_number = serializers.CharField(allow_null=True)
    arrival_time = serializers.DateTimeField()
    status = serializers.CharField()
    doctor_name = serializers.CharField(allow_blank=True)
    triage = VisitTriageHistorySerializer(allow_null=True)
    reception = VisitReceptionHistorySerializer()
    consultation = ConsultationHistorySerializer(allow_null=True)
    lab_orders = LabOrderHistorySerializer(many=True)
    prescriptions = PrescriptionHistorySerializer(many=True)
    nurse_tasks = NurseTaskHistorySerializer(many=True)


class VisitAdminHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    registration_number = serializers.CharField(allow_null=True)
    arrival_time = serializers.DateTimeField()
    status = serializers.CharField()
    doctor_name = serializers.CharField(allow_blank=True)
    reception = VisitReceptionHistorySerializer()
    invoice = InvoiceHistorySerializer(allow_null=True)


class PatientClinicalHistorySerializer(serializers.Serializer):
    patient = PatientSerializer()
    visits = VisitClinicalHistorySerializer(many=True)


class PatientAdminHistorySerializer(serializers.Serializer):
    patient = PatientSerializer()
    visits = VisitAdminHistorySerializer(many=True)
