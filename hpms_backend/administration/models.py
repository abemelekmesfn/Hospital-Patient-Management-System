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

    CATEGORY_CHOICES = (
        ("MEDICINE", "Medicine"),
        ("ASSETS", "Assets"),
        ("SUPPLIES", "Supplies"),
        ("EQUIPMENT", "Equipment"),
        ("LABORATORY", "Laboratory"),
    )

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, blank=True, default="")
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
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
