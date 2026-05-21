from django.contrib import admin
from .models import Consultation, Prescription, LabOrder, NurseTask

admin.site.register(Consultation)
admin.site.register(Prescription)
admin.site.register(LabOrder)
admin.site.register(NurseTask)
