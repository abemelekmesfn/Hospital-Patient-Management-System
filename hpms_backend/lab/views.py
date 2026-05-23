from collections import defaultdict

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from doctor.models import LabOrder
from triage.models import Visit
from billing.services import lab_charge_is_cleared

VISIT_EXCLUDED_FROM_LAB_QUEUE = frozenset(
    {
        "CONSULTATION_COMPLETED",
        "DISCHARGED",
    }
)


class LabResultUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(LabOrder, pk=pk)
        if order.status == "COMPLETED":
            return Response(
                {"detail": "This order is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.result = request.data.get("result") or ""
        order.status = "COMPLETED"
        order.completed_at = timezone.now()
        order.doctor_lab_toast_dismissed = False
        order.doctor_lab_result_modal_seen = False
        order.save()

        visit = order.visit
        if visit.status == "WAITING_LAB_RESULTS" and not visit.lab_orders.exclude(
            status="COMPLETED"
        ).exists():
            visit.status = "LAB_RESULTS_READY"
            visit.save()

        return Response({"message": "Result saved"})


class LabVisitSubmitView(APIView):
    """
    Save results for all pending lab orders of a visit in one request.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, visit_id):
        visit = get_object_or_404(Visit, pk=visit_id)
        if visit.status in VISIT_EXCLUDED_FROM_LAB_QUEUE:
            return Response(
                {"detail": "This visit is no longer on the lab queue."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders_payload = request.data.get("orders")
        if not isinstance(orders_payload, list) or not orders_payload:
            return Response(
                {"detail": "Expected a non-empty orders array: [{id, result}, ...]"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                for item in orders_payload:
                    oid = item.get("id")
                    if oid is None:
                        raise ValueError("missing id")
                    order = LabOrder.objects.select_for_update().get(
                        id=oid,
                        visit_id=visit_id,
                        status="PENDING",
                    )
                    order.result = item.get("result") or ""
                    order.status = "COMPLETED"
                    order.completed_at = timezone.now()
                    order.doctor_lab_toast_dismissed = False
                    order.doctor_lab_result_modal_seen = False
                    order.save()
        except LabOrder.DoesNotExist:
            return Response(
                {"detail": "One or more lab orders were not found or not pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        visit.refresh_from_db()
        if visit.status == "WAITING_LAB_RESULTS" and not visit.lab_orders.exclude(
            status="COMPLETED"
        ).exists():
            visit.status = "LAB_RESULTS_READY"
            visit.save()

        return Response({"message": "Results saved"})


class LabQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            LabOrder.objects.filter(status="PENDING")
            .exclude(visit__status__in=VISIT_EXCLUDED_FROM_LAB_QUEUE)
            .select_related("visit__patient", "visit__triage")
            .order_by("visit_id", "id")
        )

        grouped = defaultdict(list)
        for o in orders:
            if not lab_charge_is_cleared(o):
                continue
            grouped[o.visit_id].append(o)

        out = []
        for vid in sorted(grouped.keys()):
            group = grouped[vid]
            v0 = group[0].visit
            triage = getattr(v0, "triage", None)
            out.append(
                {
                    "visit_id": vid,
                    "patient_name": f"{v0.patient.first_name} {v0.patient.last_name}".strip(),
                    "priority": triage.priority if triage else None,
                    "orders": [
                        {
                            "id": lo.id,
                            "test_name": lo.test_name,
                            "status": lo.status,
                        }
                        for lo in group
                    ],
                }
            )
        return Response(out)
