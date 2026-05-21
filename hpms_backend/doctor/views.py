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
from .models import LabOrder
from .serializers import CreateLabOrderSerializer
from .serializers import CompleteEncounterSerializer


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
        Q(status="WAITING_DOCTOR") | Q(status="IN_CONSULTATION", doctor=request.user)
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

    return Response(serializer.errors)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_nurse_task(request):

    serializer = CreateNurseTaskSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Task sent to nurse"})

    return Response(serializer.errors)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_prescription(request):

    serializer = CreatePrescriptionSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(doctor=request.user)
        return Response({"message": "Prescription added"})

    return Response(serializer.errors)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_lab_order(request):

    serializer = CreateLabOrderSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Lab test ordered"})

    return Response(serializer.errors)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_encounter(request):

    serializer = CompleteEncounterSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Encounter completed"})

    return Response(serializer.errors)


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
    visit = Visit.objects.get(id=visit_id)
    if visit.status == "WAITING_DOCTOR" and not visit.doctor:
        visit.doctor = request.user
        visit.status = "IN_CONSULTATION"
        visit.save()
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