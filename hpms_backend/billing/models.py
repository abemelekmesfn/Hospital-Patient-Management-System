from django.db import models
from triage.models import Visit


class Invoice(models.Model):

    PAYMENT_METHODS = [
        ("CASH", "Cash"),
        ("CARD", "Card"),
        ("MOBILE", "Mobile Money"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
    ]

    visit = models.OneToOneField(
        Visit,
        on_delete=models.CASCADE,
        related_name="invoice"
    )

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    insurance_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice #{self.id}"


class InvoiceItem(models.Model):

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items"
    )

    service_name = models.CharField(max_length=255)

    department = models.CharField(max_length=100)

    cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.service_name

# Create your models here.
