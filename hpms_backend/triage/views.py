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

    # Check if patient already has visit today
    visit = Visit.objects.filter(
        patient=patient,
        created_at__date=date.today()
    ).first()

    # If not create new visit
    if not visit:
        visit = Visit.objects.create(
            patient=patient,
            status="WAITING_RECEPTION"
        )

    # Create triage
    serializer = TriageSerializer(data=request.data)

    if serializer.is_valid():
        Triage.objects.create(
            visit=visit,
            **serializer.validated_data
        )
        return Response({"message": "Triage recorded successfully"})

    return Response(serializer.errors, status=400)
