from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from .models import Patient
from .serializers import PatientSerializer
from .history import build_clinical_history, build_admin_history
from triage.models import Visit, Triage


def _sex_display(sex):
    if sex == "MALE":
        return "Male"
    if sex == "FEMALE":
        return "Female"
    return sex or ""


def _arrival_mode_display(mode):
    mapping = {
        "EMS": "AMBULANCE",
        "PRIVATE": "PRIVATE",
        "TAXI": "WALKING",
        "POLICE": "POLICE",
    }
    return mapping.get(mode, mode or "")


@api_view(["GET"])
def search_patient(request):
    query = (request.GET.get("q") or "").strip()

    if not query:
        return Response([])

    triage_patient_ids = (
        Triage.objects.filter(triage_patient_name__icontains=query)
        .exclude(patient_id__isnull=True)
        .values_list("patient_id", flat=True)
        .distinct()
    )

    triage_ids = list(triage_patient_ids)

    patients = (
        Patient.objects.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(phone__icontains=query)
            | Q(hospital_id__icontains=query)
            | Q(id__in=triage_ids)
        )
        .filter(
            Q(id__in=triage_ids)
            | ~Q(first_name="Unknown", last_name__in=["Male", "Female"])
        )
        .order_by("-created_at")
        .distinct()[:12]
    )

    data = PatientSerializer(patients, many=True).data
    for row, patient in zip(data, patients):
        if not (row.get("display_name") or "").strip():
            latest_name = (
                Triage.objects.filter(patient_id=patient.id)
                .exclude(triage_patient_name="")
                .order_by("-created_at")
                .values_list("triage_patient_name", flat=True)
                .first()
            )
            if latest_name:
                row["display_name"] = latest_name.strip()
    return Response(data)


@api_view(["POST"])
def quick_add_patient(request):
    sex = request.data.get("sex")

    if sex not in ["MALE", "FEMALE"]:
        return Response({"error": "Sex must be MALE or FEMALE"}, status=400)

    patient = Patient.objects.create(
        first_name="Unknown",
        last_name="Male" if sex == "MALE" else "Female",
        sex=sex,
        is_unknown=True,
    )

    serializer = PatientSerializer(patient)
    return Response(serializer.data)


@api_view(["GET"])
def patient_detail(request, pk):
    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    serializer = PatientSerializer(patient)
    return Response(serializer.data)


@api_view(["GET"])
def patient_autofill(request, pk):
    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    last_visit = (
        Visit.objects.filter(patient=patient)
        .select_related("triage")
        .order_by("-arrival_time")
        .first()
    )

    triage = getattr(last_visit, "triage", None) if last_visit else None
    pending_visit = (
        Visit.objects.filter(patient=patient, status="WAITING_RECEPTION")
        .select_related("triage")
        .order_by("-arrival_time")
        .first()
    )
    active_triage = (
        getattr(pending_visit, "triage", None) if pending_visit else triage
    )

    fn = (patient.first_name or "").strip()
    ln = (patient.last_name or "").strip()
    is_placeholder = fn == "Unknown" and ln in ("Male", "Female")
    full_name = (
        (active_triage.triage_patient_name or "").strip()
        if active_triage and (active_triage.triage_patient_name or "").strip()
        else ("" if is_placeholder else f"{fn} {ln}".strip())
    )

    payload = {
        "patient_id": patient.id,
        "hospital_id": patient.hospital_id,
        "first_name": fn if not is_placeholder else "",
        "last_name": ln if not is_placeholder else "",
        "full_name": full_name,
        "age": PatientSerializer().get_age(patient),
        "sex": patient.sex,
        "sex_display": _sex_display(patient.sex),
        "phone": patient.phone or "",
        "date_of_birth": patient.date_of_birth,
        "pending_visit_id": pending_visit.id if pending_visit else None,
        "triage": None,
    }

    if active_triage:
        visit = active_triage.visit
        payload["triage"] = {
            "priority": active_triage.priority,
            "chief_complaint": active_triage.chief_complaint or "",
            "temperature": active_triage.temperature,
            "blood_pressure": active_triage.blood_pressure or "",
            "pulse": active_triage.pulse,
            "respiratory_rate": active_triage.respiratory_rate,
            "arrival_mode": _arrival_mode_display(visit.arrival_mode)
            if visit
            else "",
        }

    return Response(payload)


@api_view(["GET"])
def patient_clinical_history(request, pk):
    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    return Response(
        {
            "patient": PatientSerializer(patient).data,
            "visits": build_clinical_history(patient),
        }
    )


@api_view(["GET"])
def patient_admin_history(request, pk):
    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    return Response(
        {
            "patient": PatientSerializer(patient).data,
            "visits": build_admin_history(patient),
        }
    )
