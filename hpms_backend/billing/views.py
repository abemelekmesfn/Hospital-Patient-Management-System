from decimal import Decimal

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.permissions import IsAuthenticatedAdmin
from triage.models import Visit
from users.permissions import IsCashier, IsPharmacist

from .models import BillingCharge, HospitalService, PharmacySale, PharmacySaleLine
from .serializers import (
    BillingChargeSerializer,
    CashierQueueVisitSerializer,
    HospitalServiceSerializer,
    PharmacySaleSerializer,
)
from . import services


class BillingPermissionMixin:
    permission_classes = [IsAuthenticated]


class CashierQueueView(BillingPermissionMixin, APIView):
    """Visits with pending cashier charges (excludes pharmacy stage)."""

    def get(self, request):
        pending = BillingCharge.objects.filter(
            status="PENDING"
        ).exclude(stage="PHARMACY").select_related("visit__patient", "visit__triage")

        by_visit = {}
        for ch in pending:
            vid = ch.visit_id
            if vid not in by_visit:
                v = ch.visit
                p = v.patient
                by_visit[vid] = {
                    "visit_id": vid,
                    "patient_name": f"{p.first_name} {p.last_name}".strip(),
                    "hospital_id": p.hospital_id,
                    "registration_number": v.registration_number,
                    "billing_deferred": v.billing_deferred,
                    "insurance_type": p.insurance_type,
                    "billing_exempt": p.billing_exempt,
                    "pending_count": 0,
                    "pending_total": Decimal("0"),
                    "stages": set(),
                }
            by_visit[vid]["pending_count"] += 1
            by_visit[vid]["pending_total"] += ch.patient_amount
            by_visit[vid]["stages"].add(ch.stage)

        out = []
        for row in by_visit.values():
            row["pending_total_etb"] = str(row.pop("pending_total").quantize(Decimal("0.01")))
            row["stages"] = sorted(row["stages"])
            out.append(row)
        out.sort(key=lambda x: x["visit_id"])
        serializer = CashierQueueVisitSerializer(out, many=True)
        return Response(serializer.data)


class VisitChargesView(BillingPermissionMixin, APIView):
    def get(self, request, visit_id):
        visit = get_object_or_404(Visit.objects.select_related("patient"), pk=visit_id)
        charges = visit.billing_charges.exclude(stage="PHARMACY").order_by("created_at")
        return Response(
            {
                "visit_id": visit.id,
                "patient_name": f"{visit.patient.first_name} {visit.patient.last_name}".strip(),
                "hospital_id": visit.patient.hospital_id,
                "registration_number": visit.registration_number,
                "billing_deferred": visit.billing_deferred,
                "insurance_type": visit.patient.insurance_type,
                "insurance_coverage_percent": visit.patient.insurance_coverage_percent,
                "billing_exempt": visit.patient.billing_exempt,
                "charges": BillingChargeSerializer(charges, many=True).data,
            }
        )


class PayChargesView(BillingPermissionMixin, APIView):
    def post(self, request):
        charge_ids = request.data.get("charge_ids") or []
        payment_method = request.data.get("payment_method")
        if not charge_ids or not payment_method:
            return Response(
                {"detail": "charge_ids and payment_method are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valid = {c[0] for c in BillingCharge.PAYMENT_METHODS}
        if payment_method not in valid:
            return Response(
                {"detail": f"payment_method must be one of: {', '.join(sorted(valid))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        receipt = services.pay_charges(charge_ids, payment_method, request.user)
        if not receipt:
            return Response(
                {"detail": "No pending charges found for those ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"message": "Payment recorded.", "receipt": receipt})


class PayVisitBulkView(BillingPermissionMixin, APIView):
    def post(self, request, visit_id):
        payment_method = request.data.get("payment_method")
        stage = request.data.get("stage")
        if not payment_method:
            return Response(
                {"detail": "payment_method is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        receipt = services.pay_visit_bulk(visit_id, payment_method, request.user, stage=stage)
        if not receipt:
            return Response(
                {"detail": "No pending charges for this visit."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"message": "Payment recorded.", "receipt": receipt})


class ReceiptDetailView(BillingPermissionMixin, APIView):
    def get(self, request, receipt_number):
        charges = BillingCharge.objects.filter(
            receipt_number=receipt_number, status="PAID"
        ).select_related("visit__patient")
        if not charges.exists():
            return Response({"detail": "Receipt not found."}, status=status.HTTP_404_NOT_FOUND)
        ch = charges.first()
        payload = services.build_receipt_from_charges(
            list(charges),
            receipt_number,
            ch.payment_method,
            ch.paid_at or timezone.now(),
        )
        return Response(payload)


# Legacy endpoints (invoice-based queue) — redirect logic to charges
class BillingQueueView(CashierQueueView):
    pass


class InvoiceDetailView(BillingPermissionMixin, APIView):
    def get(self, request, pk):
        ch = get_object_or_404(BillingCharge, pk=pk)
        visit = ch.visit
        charges = visit.billing_charges.exclude(stage="PHARMACY")
        return VisitChargesView().get(request, visit.id)


class ProcessPaymentView(BillingPermissionMixin, APIView):
    """Legacy: pay a single charge by id."""

    def post(self, request, pk):
        payment_method = request.data.get("payment_method", "CASH")
        receipt = services.pay_charges([pk], payment_method, request.user)
        if not receipt:
            return Response(
                {"detail": "Charge not found or already paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"message": "Payment processed successfully", "receipt": receipt})


class HospitalServiceListCreateView(APIView):
    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        services.ensure_default_services()
        qs = HospitalService.objects.all().order_by("service_type", "name")
        return Response(HospitalServiceSerializer(qs, many=True).data)

    def post(self, request):
        serializer = HospitalServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HospitalServiceDetailView(APIView):
    permission_classes = [IsAuthenticatedAdmin]

    def patch(self, request, pk):
        svc = get_object_or_404(HospitalService, pk=pk)
        serializer = HospitalServiceSerializer(svc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        svc = get_object_or_404(HospitalService, pk=pk)
        svc.is_active = False
        svc.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
