import os

filepath = 'hpms_backend/doctor/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'from doctor.models import Consultation, Prescription, LabOrder, NurseTask',
    'from doctor.models import Consultation, Prescription, LabOrder, NurseTask, Admission, PhysicalExamination'
)

# 2. Add serializers
new_serializers = """
class AdmissionSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    
    class Meta:
        model = Admission
        fields = "__all__"

class PhysicalExaminationSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.username", read_only=True)
    
    class Meta:
        model = PhysicalExamination
        fields = "__all__"
"""
content = content.replace(
    'class DoctorQueueSerializer(serializers.ModelSerializer):',
    new_serializers + '\nclass DoctorQueueSerializer(serializers.ModelSerializer):'
)

# 3. Add to DoctorQueueSerializer fields
content = content.replace(
    '            "status",\n        ]',
    '            "status",\n            "is_admitted",\n        ]'
)

# 4. Add to DoctorVisitSerializer fields
content = content.replace(
    '    consultation = ConsultationSerializer(read_only=True)',
    '    consultation = ConsultationSerializer(read_only=True)\n    admission = AdmissionSerializer(read_only=True)\n    physical_examinations = PhysicalExaminationSerializer(many=True, read_only=True)'
)
content = content.replace(
    '            "nurse_tasks",\n        ]',
    '            "nurse_tasks",\n            "admission",\n            "physical_examinations",\n        ]'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
