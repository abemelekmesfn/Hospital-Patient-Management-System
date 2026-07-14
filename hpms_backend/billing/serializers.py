from rest_framework import serializers

from .models import BillingCharge, HospitalService, InsuranceClaim, PharmacySale, PharmacySaleLine


class HospitalServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalService
        fields = [
            "id",
            "code",
            "name",
            "department",
            "default_price",
            "service_type",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BillingChargeSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    hospital_id = serializers.SerializerMethodField()
    payment_method_label = serializers.SerializerMethodField()

    class Meta:
        model = BillingCharge
        fields = [
            "id",
            "visit",
            "service_code",
            "service_name",
            "department",
            "gross_amount",
            "insurance_amount",
            "patient_amount",
            "stage",
            "status",
            "payment_method",
            "payment_method_label",
            "receipt_number",
            "paid_at",
            "patient_name",
            "hospital_id",
            "payer_name",
            "payer_account",
            "payer_phone",
            "lab_order",
            "created_at",
        ]

    def get_patient_name(self, obj):
        p = obj.visit.patient
        return f"{p.first_name} {p.last_name}".strip()

    def get_hospital_id(self, obj):
        return obj.visit.patient.hospital_id

    def get_payment_method_label(self, obj):
        if not obj.payment_method:
            return None
        return dict(BillingCharge.PAYMENT_METHODS).get(obj.payment_method, obj.payment_method)


class CashierQueueVisitSerializer(serializers.Serializer):
    visit_id = serializers.IntegerField()
    patient_name = serializers.CharField()
    hospital_id = serializers.CharField()
    billing_deferred = serializers.BooleanField()
    insurance_type = serializers.CharField()
    billing_exempt = serializers.CharField()
    pending_count = serializers.IntegerField()
    pending_total_etb = serializers.CharField()
    stages = serializers.ListField(child=serializers.CharField())


class PharmacySaleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacySaleLine
        fields = ["id", "drug_name", "quantity", "unit_price", "line_total", "inventory_item"]


class PharmacySaleSerializer(serializers.ModelSerializer):
    lines = PharmacySaleLineSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = PharmacySale
        fields = [
            "id",
            "visit",
            "prescription",
            "subtotal",
            "insurance_amount",
            "patient_amount",
            "total",
            "status",
            "payment_method",
            "receipt_number",
            "paid_at",
            "patient_name",
            "lines",
            "created_at",
        ]

    def get_patient_name(self, obj):
        if not obj.visit_id:
            return ""
        p = obj.visit.patient
        return f"{p.first_name} {p.last_name}".strip()


class InsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    hospital_id = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    charge_receipt_number = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InsuranceClaim
        fields = [
            "id",
            "charge",
            "insurance_company",
            "claim_amount",
            "status",
            "reference_number",
            "notes",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "patient_name",
            "hospital_id",
            "service_name",
            "charge_receipt_number",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        p = obj.charge.visit.patient
        return f"{p.first_name} {p.last_name}".strip()

    def get_hospital_id(self, obj):
        return obj.charge.visit.patient.hospital_id

    def get_service_name(self, obj):
        return obj.charge.service_name

    def get_charge_receipt_number(self, obj):
        return obj.charge.receipt_number

    def get_verified_by_name(self, obj):
        if not obj.verified_by:
            return None
        u = obj.verified_by
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.username
