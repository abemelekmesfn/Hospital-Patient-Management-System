from rest_framework import serializers
from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = InvoiceItem
        fields = "__all__"


class InvoiceSerializer(serializers.ModelSerializer):

    items = InvoiceItemSerializer(many=True, read_only=True)

    patient_name = serializers.CharField(
        source="visit.patient.first_name",
        read_only=True
    )

    hospital_id = serializers.CharField(
        source="visit.patient.hospital_id",
        read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            "id",
            "patient_name",
            "hospital_id",
            "subtotal",
            "insurance_discount",
            "total",
            "status",
            "payment_method",
            "items",
        ]