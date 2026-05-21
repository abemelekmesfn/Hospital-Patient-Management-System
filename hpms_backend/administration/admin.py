from django.contrib import admin
from .models import AuditLog, InventoryItem

admin.site.register(AuditLog)
admin.site.register(InventoryItem)
