from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from triage.models import Visit, Triage
from .serializers import ReceptionQueueSerializer
from django.shortcuts import get_object_or_404
from .serializers import VisitDetailSerializer
from .serializers import FinalizeRegistrationSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reception_queue(request):

    visit_ids_with_triage = Triage.objects.values_list("visit_id", flat=True)
    visits = Visit.objects.filter(
        status="WAITING_RECEPTION",
        id__in=visit_ids_with_triage,
    ).select_related(
        "patient",
        "triage"
    ).order_by("-triage__priority", "arrival_time")

    serializer = ReceptionQueueSerializer(visits, many=True)

    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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