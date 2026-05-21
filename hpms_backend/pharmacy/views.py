from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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


class DispenseDrugView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        item = get_object_or_404(Prescription, pk=pk)
        if item.pharmacy_status != "PENDING":
            return Response(
                {"detail": "This prescription is not pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.pharmacy_status = "DISPENSED"
        item.dispensed_at = timezone.now()
        item.save(update_fields=["pharmacy_status", "dispensed_at"])
        return Response({"message": "Drug dispensed"})


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
