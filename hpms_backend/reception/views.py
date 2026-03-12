from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from triage.models import Visit
from .serializers import ReceptionQueueSerializer
from django.shortcuts import get_object_or_404
from .serializers import VisitDetailSerializer
from .serializers import FinalizeRegistrationSerializer

@api_view(['GET'])
def reception_queue(request):

    visits = Visit.objects.filter(
        status="WAITING_RECEPTION"
    ).select_related(
        "patient",
        "triage"
    ).order_by("-triage__priority", "arrival_time")

    serializer = ReceptionQueueSerializer(visits, many=True)

    return Response(serializer.data)

@api_view(['GET'])
def visit_detail(request, visit_id):

    visit = get_object_or_404(
        Visit.objects.select_related(
            "patient",
            "triage"
        ),
        id=visit_id
    )

    serializer = VisitDetailSerializer(visit)

    return Response(serializer.data)

@api_view(['POST'])
def finalize_registration(request):

    serializer = FinalizeRegistrationSerializer(data=request.data)

    if serializer.is_valid():
        visit = serializer.save()

        return Response({
            "message": "Registration completed",
            "visit_id": visit.id,
            "registration_number": visit.registration_number
        })

    return Response(serializer.errors, status=400)

    triage = Triage.objects.get(id=triage_id)

    # Check if patient exists
    if triage.patient:
        patient = triage.patient
    else:
        # Create a new Patient from Quick Add
        patient = Patient.objects.create(
            full_name=request.data.get('full_name', 'Unknown'),
            sex=request.data.get('sex', 'Unknown'),
            date_of_birth=request.data.get('dob', None)
        )
        triage.patient = patient
        triage.save()