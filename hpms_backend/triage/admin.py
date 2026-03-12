from django.contrib import admin
from .models import Visit, Triage, NextOfKin

admin.site.register(Visit)
admin.site.register(Triage)
admin.site.register(NextOfKin)