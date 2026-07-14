import os

filepath = 'hpms_backend/nurse/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add admission details to NurseVisitSerializer or NurseTaskSerializer?
# Actually, let's see what is there.
print("Nurse serializers:\n")
print(content[:500])
