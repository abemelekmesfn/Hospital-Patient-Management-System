import os

filepath = 'hpms_backend/administration/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('        emergencies = Visit.objects.filter(triage__priority="CRITICAL").count()\n\n        return Response(', '        emergencies = Visit.objects.filter(triage__priority="CRITICAL").count()\n\n        total_beds = Bed.objects.count()\n        occupied_beds = Bed.objects.filter(is_occupied=True).count()\n        admitted_patients = Visit.objects.filter(is_admitted=True).count()\n\n        return Response(')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
