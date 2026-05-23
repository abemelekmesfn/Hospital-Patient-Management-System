# Generated manually for billing system expansion

import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
        ("doctor", "0004_lab_flags_and_pharmacy_status"),
        ("administration", "0002_inventoryitem"),
        ("patients", "0002_alter_patient_hospital_id"),
        ("triage", "0008_visit_billing"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="invoice",
            name="receipt_number",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AlterField(
            model_name="invoice",
            name="payment_method",
            field=models.CharField(
                blank=True,
                choices=[
                    ("CASH", "Cash"),
                    ("BANK_TRANSFER", "Bank transfer"),
                    ("TELEBIRR", "Tele Birr"),
                    ("INSURANCE", "Insurance"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.CreateModel(
            name="HospitalService",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("department", models.CharField(default="General", max_length=100)),
                ("default_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                (
                    "service_type",
                    models.CharField(
                        choices=[
                            ("REGISTRATION", "Registration"),
                            ("CONSULTATION", "Consultation"),
                            ("LAB", "Laboratory"),
                            ("OTHER", "Other"),
                        ],
                        default="OTHER",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["service_type", "name"]},
        ),
        migrations.CreateModel(
            name="BillingCharge",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("service_code", models.CharField(max_length=64)),
                ("service_name", models.CharField(max_length=255)),
                ("department", models.CharField(default="General", max_length=100)),
                ("gross_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("insurance_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("patient_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                (
                    "stage",
                    models.CharField(
                        choices=[
                            ("FRONT_DESK", "Front desk (registration & consultation)"),
                            ("LAB", "Laboratory"),
                            ("DISCHARGE", "Discharge / emergency settlement"),
                            ("PHARMACY", "Pharmacy"),
                        ],
                        default="FRONT_DESK",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "Pending"), ("PAID", "Paid"), ("WAIVED", "Waived")],
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                (
                    "payment_method",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("CASH", "Cash"),
                            ("BANK_TRANSFER", "Bank transfer"),
                            ("TELEBIRR", "Tele Birr"),
                            ("INSURANCE", "Insurance"),
                        ],
                        max_length=20,
                        null=True,
                    ),
                ),
                ("receipt_number", models.CharField(blank=True, default="", max_length=32)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "hospital_service",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="charges",
                        to="billing.hospitalservice",
                    ),
                ),
                (
                    "lab_order",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="billing_charge",
                        to="doctor.laborder",
                    ),
                ),
                (
                    "paid_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="processed_charges",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "visit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="billing_charges",
                        to="triage.visit",
                    ),
                ),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.CreateModel(
            name="PharmacySale",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("subtotal", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("insurance_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("patient_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("total", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "Pending"), ("PAID", "Paid"), ("WAIVED", "Waived")],
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                (
                    "payment_method",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("CASH", "Cash"),
                            ("BANK_TRANSFER", "Bank transfer"),
                            ("TELEBIRR", "Tele Birr"),
                            ("INSURANCE", "Insurance"),
                        ],
                        max_length=20,
                        null=True,
                    ),
                ),
                ("receipt_number", models.CharField(blank=True, default="", max_length=32)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "pharmacist",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pharmacy_sales",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "prescription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pharmacy_sale",
                        to="doctor.prescription",
                    ),
                ),
                (
                    "visit",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pharmacy_sales",
                        to="triage.visit",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="PharmacySaleLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("drug_name", models.CharField(max_length=255)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "inventory_item",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="administration.inventoryitem",
                    ),
                ),
                (
                    "sale",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="billing.pharmacysale",
                    ),
                ),
            ],
        ),
    ]
