import os
from django.utils import timezone

filepath = 'hpms_backend/doctor/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure imports are present
import_text = "from administration.models import Bed, Ward\nfrom .models import Admission, PhysicalExamination"
if import_text not in content:
    content = content.replace("from users.models import User", "from users.models import User\n" + import_text)

new_views = """

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
"""

if "def admit_patient" not in content:
    content += new_views

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)


urls_path = 'hpms_backend/doctor/urls.py'
with open(urls_path, 'r', encoding='utf-8') as f:
    urls_content = f.read()

if "admit_patient" not in urls_content:
    urls_content = urls_content.replace(
        "    nurse_notifications,\n)",
        "    nurse_notifications,\n    admit_patient,\n    discharge_patient,\n    add_physical_examination,\n)"
    )
    urls_content = urls_content.replace(
        "]",
        "    path('visit/<int:visit_id>/admit/', admit_patient),\n    path('visit/<int:visit_id>/discharge/', discharge_patient),\n    path('visit/<int:visit_id>/examination/', add_physical_examination),\n]"
    )

    with open(urls_path, 'w', encoding='utf-8') as f:
        f.write(urls_content)
