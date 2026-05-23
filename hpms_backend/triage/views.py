from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import date

from patients.models import Patient
from .models import Visit, Triage
from .serializers import TriageSerializer


@api_view(['POST'])
def create_triage(request):

    patient_id = request.data.get("patient_id")

    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    # Get today's latest visit for this patient (if any).
    # If a visit already exists, we reset it back to triage state so it
    # reappears in reception/doctor queues.
    visit = (
        Visit.objects.filter(
            patient=patient,
            created_at__date=date.today(),
        )
        .order_by("-id")
        .first()
    )

    if not visit:
        visit = Visit.objects.create(
            patient=patient,
            status="WAITING_RECEPTION",
            is_admitted=False,
            doctor=None,
        )
    else:
        visit.status = "WAITING_RECEPTION"
        visit.is_admitted = False
        visit.doctor = None
        visit.save()

    raw_name = (request.data.get("name") or "").strip()
    triage_data = {
        "temperature": request.data.get("temperature"),
        "blood_pressure": request.data.get("blood_pressure"),
        "pulse": request.data.get("pulse"),
        "respiratory_rate": request.data.get("respiratory_rate"),
        "chief_complaint": request.data.get("chief_complaint"),
        "priority": request.data.get("priority"),
        "triage_patient_name": raw_name,
    }

    serializer = TriageSerializer(data=triage_data)

    if serializer.is_valid():
        if raw_name:
            parts = raw_name.split(None, 1)
            patient.first_name = parts[0]
            patient.last_name = parts[1] if len(parts) > 1 else ""
            patient.is_unknown = False
            patient.save()

        triage_obj, _ = Triage.objects.update_or_create(
            visit=visit,
            defaults=serializer.validated_data,
        )
        if triage_obj.priority in ("CRITICAL", "URGENT"):
            visit.billing_deferred = True
            visit.save(update_fields=["billing_deferred"])
        return Response(
            {
                "message": "Triage recorded successfully",
                "visit_id": visit.id,
            }
        )

    return Response(serializer.errors, status=400)
