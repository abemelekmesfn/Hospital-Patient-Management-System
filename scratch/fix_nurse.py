import os

filepath = 'hpms_backend/nurse/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add admission details to NurseTaskSerializer
if "is_admitted = serializers.SerializerMethodField()" not in content:
    content = content.replace(
        '    visit_id = serializers.IntegerField(source="visit.id", read_only=True)',
        '    visit_id = serializers.IntegerField(source="visit.id", read_only=True)\n    is_admitted = serializers.SerializerMethodField()\n    ward_name = serializers.SerializerMethodField()\n    bed_number = serializers.SerializerMethodField()\n    admission_note = serializers.SerializerMethodField()'
    )

    content = content.replace(
        '            "status",\n        ]',
        '            "status",\n            "is_admitted",\n            "ward_name",\n            "bed_number",\n            "admission_note",\n        ]'
    )

    methods = """
    def get_is_admitted(self, obj):
        return obj.visit.is_admitted

    def get_ward_name(self, obj):
        if hasattr(obj.visit, 'admission') and obj.visit.admission.ward:
            return obj.visit.admission.ward.name
        return None
        
    def get_bed_number(self, obj):
        if hasattr(obj.visit, 'admission') and obj.visit.admission.bed:
            return obj.visit.admission.bed.bed_number
        return None
        
    def get_admission_note(self, obj):
        if hasattr(obj.visit, 'admission'):
            return obj.visit.admission.admission_note
        return None
"""
    content += methods
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

views_path = 'hpms_backend/nurse/views.py'
with open(views_path, 'r', encoding='utf-8') as f:
    views_content = f.read()

# Make nurse queue show admitted patients without pending tasks
if "is_admitted=True" not in views_content:
    views_content = views_content.replace(
        'NurseTask.objects.filter(status="PENDING")',
        'NurseTask.objects.filter(Q(status="PENDING") | Q(visit__is_admitted=True))'
    )
    views_content = views_content.replace(
        'from rest_framework import status',
        'from django.db.models import Q\nfrom rest_framework import status'
    )
    with open(views_path, 'w', encoding='utf-8') as f:
        f.write(views_content)
