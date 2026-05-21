from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from triage.models import Triage
from doctor.models import NurseTask
from .serializers import NurseTaskSerializer

class NurseQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = (
            NurseTask.objects.select_related("visit__patient", "visit__triage")
            .exclude(status="DONE")
            .order_by("-created_at")
        )
        serializer = NurseTaskSerializer(tasks, many=True)
        return Response(serializer.data)

class UpdateTaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            task = NurseTask.objects.get(id=pk)
        except NurseTask.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in {"PENDING", "IN_PROGRESS", "DONE"}:
            return Response(
                {"detail": "Invalid status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = new_status

        if new_status == "DONE":
            task.completed_at = timezone.now()
        else:
            task.completed_at = None

        task.save()

        return Response({"message": "Task updated"})


class NurseVisitVitalsView(APIView):
    """Read or patch bedside vitals on the patient's triage record."""

    permission_classes = [IsAuthenticated]

    def get(self, request, visit_id):
        if not NurseTask.objects.filter(visit_id=visit_id).exists():
            return Response(
                {"detail": "No nurse tasks exist for this visit."},
                status=status.HTTP_403_FORBIDDEN,
            )
        triage = get_object_or_404(Triage, visit_id=visit_id)
        return Response(
            {
                "pulse": triage.pulse,
                "respiratory_rate": triage.respiratory_rate,
                "blood_pressure": triage.blood_pressure,
                "temperature": str(triage.temperature),
            }
        )

    def patch(self, request, visit_id):
        if not NurseTask.objects.filter(visit_id=visit_id).exists():
            return Response(
                {"detail": "No nurse tasks exist for this visit."},
                status=status.HTTP_403_FORBIDDEN,
            )

        triage = get_object_or_404(Triage, visit_id=visit_id)

        if "pulse" in request.data and request.data["pulse"] not in ("", None):
            try:
                triage.pulse = int(request.data["pulse"])
            except (TypeError, ValueError):
                return Response(
                    {"detail": "pulse must be a whole number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if "respiratory_rate" in request.data and request.data["respiratory_rate"] not in (
            "",
            None,
        ):
            try:
                triage.respiratory_rate = int(request.data["respiratory_rate"])
            except (TypeError, ValueError):
                return Response(
                    {"detail": "respiratory_rate must be a whole number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if "blood_pressure" in request.data and request.data["blood_pressure"] not in (
            "",
            None,
        ):
            triage.blood_pressure = str(request.data["blood_pressure"]).strip()

        if "temperature" in request.data and request.data["temperature"] not in ("", None):
            try:
                triage.temperature = Decimal(str(request.data["temperature"]))
            except (InvalidOperation, TypeError, ValueError):
                return Response(
                    {"detail": "temperature must be a number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        triage.save(
            update_fields=[
                "pulse",
                "respiratory_rate",
                "blood_pressure",
                "temperature",
            ]
        )
        return Response(
            {
                "message": "Vitals recorded",
                "pulse": triage.pulse,
                "respiratory_rate": triage.respiratory_rate,
                "blood_pressure": triage.blood_pressure,
                "temperature": str(triage.temperature),
            }
        )