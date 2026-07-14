"""Simulate the full handleCompleted flow from the frontend."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hpms_backend.settings')
django.setup()

from triage.models import Visit
from users.models import User
from doctor.serializers import (
    CompleteEncounterSerializer,
    SaveConsultationSerializer,
    CreateLabOrderSerializer,
    CreatePrescriptionSerializer,
)

doctor = User.objects.filter(role='DOCTOR').first()
print(f"Doctor: {doctor}")

# Get a visit that's IN_CONSULTATION
visit = Visit.objects.filter(status='IN_CONSULTATION').first()
if not visit:
    # set one up
    visit = Visit.objects.last()
    if visit:
        visit.status = 'IN_CONSULTATION'
        visit.doctor = doctor
        visit.save()
        print(f"Set visit {visit.id} to IN_CONSULTATION")

if not visit:
    print("No visits found!")
    exit(1)

print(f"\n--- Testing visit {visit.id} (patient={visit.patient}) ---")

# Step 1: saveConsultation (same as frontend)
print("\n[1] saveConsultation...")
ser = SaveConsultationSerializer(data={
    'visit_id': visit.id,
    'chief_complaint': 'test complaint',
    'physical_exam': 'test exam',
    'diagnosis': 'test diagnosis',
})
if ser.is_valid():
    try:
        ser.save()
        print("   OK - consultation saved")
    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback; traceback.print_exc()
else:
    print(f"   Validation errors: {ser.errors}")

# Step 2: postLabOrders (skip - no staged labs)
print("\n[2] postLabOrders... (skipped, no staged labs)")

# Step 3: postPrescriptions (skip - no staged)
print("\n[3] postPrescriptions... (skipped, no staged)")

# Step 4: complete-encounter
print("\n[4] complete-encounter...")
ser = CompleteEncounterSerializer(data={'visit_id': visit.id})
if ser.is_valid():
    try:
        result = ser.save()
        print(f"   OK - new status: {result.status}")
    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback; traceback.print_exc()
else:
    print(f"   Validation errors: {ser.errors}")

# Now test with lab orders
print("\n\n--- Testing with lab orders ---")
visit.status = 'IN_CONSULTATION'
visit.save()

print("\n[5] Creating lab order...")
ser = CreateLabOrderSerializer(data={'visit_id': visit.id, 'test_name': 'CBC Test'})
if ser.is_valid():
    try:
        lab = ser.save()
        print(f"   OK - lab order {lab.id} created")
    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback; traceback.print_exc()
else:
    print(f"   Validation errors: {ser.errors}")

print("\n[6] complete-encounter with pending lab...")
ser = CompleteEncounterSerializer(data={'visit_id': visit.id})
if ser.is_valid():
    try:
        result = ser.save()
        print(f"   OK - new status: {result.status}")
    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback; traceback.print_exc()
else:
    print(f"   Validation errors: {ser.errors}")

# Now test with prescription
print("\n\n--- Testing with prescriptions ---")
visit.status = 'IN_CONSULTATION'
visit.save()
# clear lab orders
visit.lab_orders.all().delete()
visit.billing_charges.filter(stage='LAB').delete()

print("\n[7] Creating prescription...")
ser = CreatePrescriptionSerializer(data={
    'visit_id': visit.id,
    'drug_name': 'Amoxicillin',
    'dosage': '500mg',
    'frequency': 'TID',
    'duration': '7 days',
})
if ser.is_valid():
    try:
        rx = ser.save(doctor=doctor)
        print(f"   OK - prescription {rx.id} created")
    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback; traceback.print_exc()
else:
    print(f"   Validation errors: {ser.errors}")

print("\n[8] complete-encounter with prescription...")
ser = CompleteEncounterSerializer(data={'visit_id': visit.id})
if ser.is_valid():
    try:
        result = ser.save()
        print(f"   OK - new status: {result.status}")
    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback; traceback.print_exc()
else:
    print(f"   Validation errors: {ser.errors}")

print("\n\nDONE - All tests passed if no FAILED above.")
