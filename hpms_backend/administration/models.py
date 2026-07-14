from django.conf import settings
from django.db import models

MAX_INVENTORY_ITEMS = 200


class AuditLog(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    action = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.action


class InventoryItem(models.Model):

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, blank=True, default="")
    category = models.CharField(max_length=64)
    description = models.TextField(blank=True, default="")
    quantity = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Selling price per unit in ETB (pharmacy).",
    )
    unit = models.CharField(max_length=32, default="units")
    reorder_level = models.PositiveIntegerField(default=10)
    location = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]

    @property
    def status(self):
        if self.quantity <= self.reorder_level:
            return "low"
        return "ok"

    def __str__(self):
        return f"{self.name} ({self.category})"


class Ward(models.Model):
    WARD_TYPES = (
        ("MALE", "Male Ward"),
        ("FEMALE", "Female Ward"),
        ("EMERGENCY", "Emergency Ward"),
        ("ICU", "ICU Ward"),
        ("PEDIATRICS", "Pediatrics Ward"),
        ("LABOR", "Labor Ward"),
    )

    name = models.CharField(max_length=100)
    ward_type = models.CharField(max_length=20, choices=WARD_TYPES, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Bed(models.Model):
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="beds")
    bed_number = models.CharField(max_length=20)
    is_occupied = models.BooleanField(default=False)

    class Meta:
        unique_together = ("ward", "bed_number")

    def __str__(self):
        return f"{self.ward.name} - {self.bed_number}"
