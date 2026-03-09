from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from .models import Patient
from .serializers import PatientSerializer


@api_view(['GET'])
def search_patient(request):

    query = request.GET.get('q')

    if not query:
        return Response([])

    patients = Patient.objects.filter(
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(phone__icontains=query)
    )[:10]

    serializer = PatientSerializer(patients, many=True)

    return Response(serializer.data)

@api_view(['POST'])
def quick_add_patient(request):

    sex = request.data.get('sex')

    if sex not in ['MALE', 'FEMALE']:
        return Response({"error": "Sex must be MALE or FEMALE"}, status=400)

    patient = Patient.objects.create(
        first_name="Unknown",
        last_name="Male" if sex == "MALE" else "Female",
        sex=sex,
        is_unknown=True
    )

    serializer = PatientSerializer(patient)

    return Response(serializer.data)

@api_view(['GET'])
def patient_detail(request, pk):

    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    serializer = PatientSerializer(patient)

    return Response(serializer.data)