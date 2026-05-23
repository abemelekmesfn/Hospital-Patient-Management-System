from decimal import Decimal

from django.conf import settings
from django.db import models
from triage.models import Visit


class HospitalService(models.Model):
    """Admin-configurable hospital service catalog and default prices (ETB)."""

    SERVICE_TYPES = [
        ("REGISTRATION", "Registration"),
        ("CONSULTATION", "Consultation"),
        ("LAB", "Laboratory"),
        ("OTHER", "Other"),
    ]

    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    department = models.CharField(max_length=100, default="General")
    default_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES, default="OTHER")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["service_type", "name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class BillingCharge(models.Model):
    """Per-service charge for a visit; paid individually or in bulk at cashier."""

    STAGES = [
        ("FRONT_DESK", "Front desk (registration & consultation)"),
        ("LAB", "Laboratory"),
        ("DISCHARGE", "Discharge / emergency settlement"),
        ("PHARMACY", "Pharmacy"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("WAIVED", "Waived"),
    ]

    PAYMENT_METHODS = [
        ("CASH", "Cash"),
        ("BANK_TRANSFER", "Bank transfer"),
        ("TELEBIRR", "Tele Birr"),
        ("INSURANCE", "Insurance"),
    ]

    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="billing_charges")
    hospital_service = models.ForeignKey(
        HospitalService,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="charges",
    )
    service_code = models.CharField(max_length=64)
    service_name = models.CharField(max_length=255)
    department = models.CharField(max_length=100, default="General")
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    insurance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    patient_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.CharField(max_length=20, choices=STAGES, default="FRONT_DESK")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHODS, null=True, blank=True
    )
    receipt_number = models.CharField(max_length=32, blank=True, default="")
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_charges",
    )
    lab_order = models.OneToOneField(
        "doctor.LabOrder",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="billing_charge",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.service_name} — {self.visit_id}"


class Invoice(models.Model):
    """Legacy aggregate invoice; kept for admin revenue compatibility."""

    PAYMENT_METHODS = BillingCharge.PAYMENT_METHODS
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
    ]

    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name="invoice")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    insurance_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHODS, null=True, blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    receipt_number = models.CharField(max_length=32, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice #{self.id}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    service_name = models.CharField(max_length=255)
    department = models.CharField(max_length=100)
    cost = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return self.service_name


class PharmacySale(models.Model):
    """Pharmacy point-of-sale; revenue tracked separately from cashier."""

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("WAIVED", "Waived"),
    ]

    visit = models.ForeignKey(
        Visit, on_delete=models.CASCADE, related_name="pharmacy_sales", null=True, blank=True
    )
    prescription = models.ForeignKey(
        "doctor.Prescription",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pharmacy_sale",
    )
    pharmacist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="pharmacy_sales",
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    insurance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    patient_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    payment_method = models.CharField(
        max_length=20, choices=BillingCharge.PAYMENT_METHODS, null=True, blank=True
    )
    receipt_number = models.CharField(max_length=32, blank=True, default="")
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pharmacy sale #{self.id}"


class PharmacySaleLine(models.Model):
    sale = models.ForeignKey(PharmacySale, on_delete=models.CASCADE, related_name="lines")
    inventory_item = models.ForeignKey(
        "administration.InventoryItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    drug_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.line_total = (self.unit_price or Decimal("0")) * self.quantity
        super().save(*args, **kwargs)
