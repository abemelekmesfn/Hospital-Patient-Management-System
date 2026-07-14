from django.shortcuts import get_object_or_404, render
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from triage.models import Visit, Triage
from .serializers import DoctorQueueSerializer
from .serializers import DoctorVisitSerializer
from .models import Consultation
from .serializers import SaveConsultationSerializer
from .models import NurseTask
from .serializers import CreateNurseTaskSerializer
from .models import Prescription
from .serializers import CreatePrescriptionSerializer
from .serializers import CreateLabOrderSerializer
from .serializers import CompleteEncounterSerializer
from nurse.models import NurseObservation
from nurse.serializers import NurseObservationSerializer
from users.models import User
from administration.models import Bed, Ward
from .models import Admission, PhysicalExamination


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctor_queue(request):
    # Visits that have triage (explicit join — reliable vs triage__isnull on OneToOne)
    visit_ids_with_triage = Triage.objects.values_list("visit_id", flat=True)

    # Waiting list + visits this doctor has claimed (ongoing encounters)
    new_patients = Visit.objects.filter(
        id__in=visit_ids_with_triage,
        is_admitted=False,
    ).filter(
        Q(status="WAITING_DOCTOR", triage__doctor_department=request.user.department, doctor__isnull=True) | 
        Q(status="WAITING_DOCTOR", doctor=request.user) | 
        Q(status="IN_CONSULTATION", doctor=request.user)
    ).order_by("arrival_time")

    bed_patients = Visit.objects.filter(
        id__in=visit_ids_with_triage,
        is_admitted=True,
        status__in=["ADMITTED", "IN_CONSULTATION"],
    ).order_by("arrival_time")

    return Response({
        "new_patients": DoctorQueueSerializer(new_patients, many=True).data,
        "bed_patients": DoctorQueueSerializer(bed_patients, many=True).data
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctor_visit(request, visit_id):

    visit = Visit.objects.get(id=visit_id)

    serializer = DoctorVisitSerializer(visit)

    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_consultation(request):

    serializer = SaveConsultationSerializer(data=request.data)

    if serializer.is_valid():
        consultation = serializer.save()
        return Response({"message": "Consultation saved"})

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_nurse_task(request):
    data = request.data.copy()
    visit_id = data.get("visit_id")
    assigned_nurse = data.get("assigned_nurse")

    if not assigned_nurse and visit_id:
        existing_task = NurseTask.objects.filter(visit_id=visit_id, assigned_nurse__isnull=False).first()
        if existing_task:
            data["assigned_nurse"] = existing_task.assigned_nurse.id

    serializer = CreateNurseTaskSerializer(data=data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Task sent to nurse"})

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_prescription(request):

    serializer = CreatePrescriptionSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(doctor=request.user)
        return Response({"message": "Prescription added"})

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_lab_order(request):

    serializer = CreateLabOrderSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Lab test ordered"})

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_encounter(request):

    serializer = CompleteEncounterSerializer(data=request.data)

    if serializer.is_valid():
        try:
            serializer.save()
            return Response({"message": "Encounter completed"})
        except Visit.DoesNotExist:
            return Response(
                {"detail": "Visit not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": f"Could not complete encounter: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _visit_for_doctor(user, visit_id):
    visit = Visit.objects.get(id=visit_id)
    if visit.doctor_id and visit.doctor_id != user.id:
        return None, Response(
            {"detail": "Not allowed for this visit."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return visit, None


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_lab_order(request, order_id):
    try:
        order = LabOrder.objects.select_related("visit").get(id=order_id)
    except LabOrder.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if order.status != "PENDING":
        return Response(
            {"detail": "Only pending lab orders can be removed."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    visit, err = _visit_for_doctor(request.user, order.visit_id)
    if err:
        return err
    order.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_prescription(request, prescription_id):
    try:
        rx = Prescription.objects.select_related("visit").get(id=prescription_id)
    except Prescription.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    visit, err = _visit_for_doctor(request.user, rx.visit_id)
    if err:
        return err
    rx.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_nurse_task(request, task_id):
    try:
        task = NurseTask.objects.select_related("visit").get(id=task_id)
    except NurseTask.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if task.status != "PENDING":
        return Response(
            {"detail": "Only pending tasks can be removed."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    visit, err = _visit_for_doctor(request.user, task.visit_id)
    if err:
        return err
    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# Claim a patient (assign doctor)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def claim_patient(request, visit_id):
    try:
        visit = Visit.objects.get(id=visit_id)
    except Visit.DoesNotExist:
        return Response({"detail": "Visit not found."}, status=status.HTTP_404_NOT_FOUND)

    # Allow claiming if waiting, or re-opening if already this doctor's patient
    if visit.status == "WAITING_DOCTOR" and (not visit.doctor or visit.doctor == request.user):
        visit.doctor = request.user
        visit.status = "IN_CONSULTATION"
        visit.save()
    elif visit.status == "IN_CONSULTATION" and visit.doctor == request.user:
        pass  # Already claimed by this doctor — just open it
    elif visit.doctor and visit.doctor != request.user:
        return Response(
            {"detail": "This patient is already being seen by another doctor."},
            status=status.HTTP_409_CONFLICT,
        )

    return Response(DoctorVisitSerializer(visit).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pending_lab_notifications(request):
    """Lab orders with new results for this doctor (toast strip)."""
    qs = (
        LabOrder.objects.filter(
            visit__doctor=request.user,
            status="COMPLETED",
        )
        .exclude(result="")
        .filter(
            doctor_lab_result_modal_seen=False,
            doctor_lab_toast_dismissed=False,
        )
        .select_related("visit__patient")
        .order_by("-completed_at")[:40]
    )
    data = [
        {
            "id": o.id,
            "visit_id": o.visit_id,
            "patient_name": (
                f"{o.visit.patient.first_name} {o.visit.patient.last_name}".strip()
            ),
            "test_name": o.test_name,
            "result": o.result,
        }
        for o in qs
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dismiss_lab_notification(request, order_id):
    order = get_object_or_404(
        LabOrder.objects.filter(visit__doctor=request.user), pk=order_id
    )
    order.doctor_lab_toast_dismissed = True
    order.save(update_fields=["doctor_lab_toast_dismissed"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def acknowledge_lab_results(request):
    """
    Mark one or more lab orders as viewed after the doctor closes the results modal.
    """
    visit_id = request.data.get("visit_id")
    order_ids = request.data.get("order_ids")
    if visit_id is None or not isinstance(order_ids, list) or not order_ids:
        return Response(
            {"detail": "visit_id and non-empty order_ids[] are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    updated = LabOrder.objects.filter(
        visit_id=visit_id,
        visit__doctor=request.user,
        id__in=order_ids,
    ).update(doctor_lab_result_modal_seen=True)
    if updated == 0:
        return Response({"detail": "No matching orders."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"updated": updated})


# ── Doctor Reports ──────────────────────────────────────────────────────
from datetime import timedelta, date as _date
from django.db.models import Count
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from patients.models import Patient


def _range_start(range_key):
    today = timezone.now().date()
    if range_key == "daily":
        return today
    if range_key == "weekly":
        return today - timedelta(days=6)
    if range_key == "monthly":
        return today - timedelta(days=29)
    if range_key == "yearly":
        return today - timedelta(days=364)
    return today - timedelta(days=6)


def _trunc_fn(range_key):
    if range_key == "yearly":
        return TruncMonth
    if range_key == "monthly":
        return TruncWeek
    return TruncDate


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctor_reports(request):
    range_key = request.query_params.get("range", "weekly")
    since = _range_start(range_key)

    # Base queryset: consultations for this doctor in the range
    consults = Consultation.objects.filter(
        visit__doctor=request.user,
        created_at__date__gte=since,
    )

    # 1. Patient Summary
    patient_count = consults.count()

    # 2. Common Diagnoses — top 10
    common_diagnoses = list(
        consults.exclude(diagnosis="")
        .values("diagnosis")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # 3. Patient Demographics
    patient_ids = consults.values_list("visit__patient_id", flat=True).distinct()
    patients_qs = Patient.objects.filter(id__in=patient_ids)

    male = patients_qs.filter(sex="MALE").count()
    female = patients_qs.filter(sex="FEMALE").count()
    other_sex = patients_qs.exclude(sex__in=["MALE", "FEMALE"]).count()

    today = timezone.now().date()
    children = 0
    adults = 0
    elderly = 0
    for dob in patients_qs.exclude(date_of_birth__isnull=True).values_list("date_of_birth", flat=True):
        age = (today - dob).days // 365
        if age < 15:
            children += 1
        elif age < 65:
            adults += 1
        else:
            elderly += 1

    demographics = {
        "gender": {"male": male, "female": female, "other": other_sex},
        "age_groups": {"children_0_14": children, "adults_15_64": adults, "elderly_65_plus": elderly},
    }

    # 4. Disease Trends
    trunc = _trunc_fn(range_key)
    disease_trends = list(
        consults.exclude(diagnosis="")
        .annotate(period=trunc("created_at"))
        .values("period", "diagnosis")
        .annotate(count=Count("id"))
        .order_by("period")
    )
    # Convert dates to strings
    for row in disease_trends:
        if row.get("period"):
            row["period"] = row["period"].isoformat() if hasattr(row["period"], "isoformat") else str(row["period"])

    # 5. Prescription Stats — top 10 drugs
    rx_stats = list(
        Prescription.objects.filter(
            visit__doctor=request.user,
            created_at__date__gte=since,
        )
        .values("drug_name")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    return Response({
        "patient_summary": {"count": patient_count, "range": range_key},
        "common_diagnoses": common_diagnoses,
        "demographics": demographics,
        "disease_trends": disease_trends,
        "rx_stats": rx_stats,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_nurses(request):
    nurses = User.objects.filter(role="NURSE", is_active=True)
    result = []
    for nurse in nurses:
        queue_count = NurseTask.objects.filter(assigned_nurse=nurse).exclude(status="DONE").count()
        result.append({
            "id": nurse.id,
            "name": f"{nurse.first_name} {nurse.last_name}".strip() or nurse.username,
            "queue_count": queue_count
        })
    return Response(result)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nurse_observations(request, visit_id):
    observations = NurseObservation.objects.filter(visit_id=visit_id).order_by("-committed_at")
    serializer = NurseObservationSerializer(observations, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def acknowledge_nurse_data(request):
    visit_id = request.data.get("visit_id")
    observation_ids = request.data.get("observation_ids", [])
    if not visit_id or not observation_ids:
        return Response({"detail": "visit_id and observation_ids required."}, status=status.HTTP_400_BAD_REQUEST)
    
    NurseObservation.objects.filter(id__in=observation_ids, visit_id=visit_id).update(doctor_seen=True)
    return Response({"message": "Observations acknowledged."})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nurse_notifications(request):
    visit_ids = Triage.objects.values_list("visit_id", flat=True)
    queue_visits = Visit.objects.filter(
        id__in=visit_ids,
        status__in=["WAITING_DOCTOR", "IN_CONSULTATION"]
    ).filter(
        Q(doctor=request.user) | Q(doctor__isnull=True)
    ).values_list("id", flat=True)

    observations = NurseObservation.objects.filter(
        visit_id__in=queue_visits,
        doctor_seen=False
    ).select_related("visit__patient", "nurse").order_by("-committed_at")

    result = []
    for obs in observations:
        nurse_name = f"{obs.nurse.first_name} {obs.nurse.last_name}".strip() if obs.nurse else "Unknown Nurse"
        patient_name = f"{obs.visit.patient.first_name} {obs.visit.patient.last_name}".strip()
        result.append({
            "id": obs.id,
            "visit_id": obs.visit_id,
            "patient_name": patient_name,
            "nurse_name": nurse_name,
            "commit_type": obs.commit_type,
            "committed_at": obs.committed_at
        })
    return Response(result)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admit_patient(request, visit_id):
    visit, err = _visit_for_doctor(request.user, visit_id)
    if err:
        return err

    ward_id = request.data.get("ward_id")
    bed_id = request.data.get("bed_id")
    note = request.data.get("note", "")

    if not ward_id or not bed_id:
        return Response({"detail": "Ward and Bed are required."}, status=400)

    try:
        bed = Bed.objects.get(id=bed_id, ward_id=ward_id)
    except Bed.DoesNotExist:
        return Response({"detail": "Invalid Bed/Ward selection."}, status=400)

    if bed.is_occupied:
        return Response({"detail": "This bed is already occupied."}, status=400)

    # Free previous bed if already admitted
    if hasattr(visit, "admission") and visit.admission.bed:
        prev_bed = visit.admission.bed
        prev_bed.is_occupied = False
        prev_bed.save()
        visit.admission.delete()

    admission = Admission.objects.create(
        visit=visit,
        ward_id=ward_id,
        bed=bed,
        admission_note=note
    )

    bed.is_occupied = True
    bed.save()

    visit.status = "ADMITTED"
    visit.is_admitted = True
    visit.save()

    return Response({"detail": "Patient admitted successfully.", "admission_id": admission.id})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def discharge_patient(request, visit_id):
    visit, err = _visit_for_doctor(request.user, visit_id)
    if err:
        return err

    if not hasattr(visit, "admission"):
        return Response({"detail": "Patient is not admitted."}, status=400)

    admission = visit.admission
    bed = admission.bed
    if bed:
        bed.is_occupied = False
        bed.save()
    
    from django.utils import timezone
    admission.discharged_at = timezone.now()
    admission.save()

    visit.status = "DISCHARGED"
    visit.is_admitted = False
    visit.save()

    return Response({"detail": "Patient discharged successfully."})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_physical_examination(request, visit_id):
    visit, err = _visit_for_doctor(request.user, visit_id)
    if err:
        return err

    note = request.data.get("note")
    if not note:
        return Response({"detail": "Note is required."}, status=400)

    PhysicalExamination.objects.create(
        visit=visit,
        doctor=request.user,
        note=note
    )

    return Response({"detail": "Examination added."})
