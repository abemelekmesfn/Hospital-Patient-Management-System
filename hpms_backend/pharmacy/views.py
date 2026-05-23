from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing import services as billing_services
from billing.serializers import PharmacySaleSerializer
from doctor.models import Prescription

from .serializers import PharmacyQueueSerializer


class PharmacyQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = (
            Prescription.objects.filter(pharmacy_status="PENDING")
            .select_related("visit__patient", "visit__triage")
            .order_by("visit_id", "id")
        )
        serializer = PharmacyQueueSerializer(items, many=True)
        return Response(serializer.data)


class PrescriptionQuoteView(APIView):
    """Price quote before dispense (ETB)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        item = get_object_or_404(Prescription, pk=pk)
        if item.pharmacy_status != "PENDING":
            return Response(
                {"detail": "Prescription is not pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sale = billing_services.create_pharmacy_sale_for_prescription(item, request.user)
        patient = item.visit.patient
        return Response(
            {
                "sale_id": sale.id,
                "drug_name": item.drug_name,
                "subtotal": str(sale.subtotal),
                "insurance_amount": str(sale.insurance_amount),
                "patient_amount": str(sale.patient_amount),
                "total": str(sale.total),
                "status": sale.status,
                "currency": "ETB",
                "insurance_type": patient.insurance_type,
                "billing_exempt": patient.billing_exempt,
            }
        )


class DispenseDrugView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        item = get_object_or_404(Prescription, pk=pk)
        if item.pharmacy_status != "PENDING":
            return Response(
                {"detail": "This prescription is not pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method")
        sale = billing_services.create_pharmacy_sale_for_prescription(item, request.user)

        if sale.status == "WAIVED":
            billing_services.complete_waived_pharmacy_sale(sale.id, request.user)
            return Response({"message": "Dispensed (billing waived).", "receipt": None})

        if not payment_method:
            return Response(
                {
                    "detail": "payment_method required (CASH, BANK_TRANSFER, TELEBIRR, INSURANCE).",
                    "sale_id": sale.id,
                    "amount_due": str(sale.patient_amount),
                    "currency": "ETB",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        receipt = billing_services.pay_pharmacy_sale(sale.id, payment_method, request.user)
        return Response({"message": "Drug dispensed and payment recorded.", "receipt": receipt})


class PharmacistPrescriptionPatchView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        item = get_object_or_404(Prescription, pk=pk)
        if item.pharmacy_status != "PENDING":
            return Response(
                {"detail": "Only pending prescriptions can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dosage = request.data.get("dosage")
        frequency = request.data.get("frequency")
        duration = request.data.get("duration")
        update_fields = []
        if dosage is not None:
            item.dosage = str(dosage).strip() or "-"
            update_fields.append("dosage")
        if frequency is not None:
            item.frequency = str(frequency).strip() or "-"
            update_fields.append("frequency")
        if duration is not None:
            item.duration = str(duration).strip() or "-"
            update_fields.append("duration")
        if not update_fields:
            return Response(
                {"detail": "Provide dosage, frequency, or duration."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.save(update_fields=update_fields)
        return Response(
            {
                "id": item.id,
                "drug_name": item.drug_name,
                "dosage": item.dosage,
                "frequency": item.frequency,
                "duration": item.duration,
            }
        )
