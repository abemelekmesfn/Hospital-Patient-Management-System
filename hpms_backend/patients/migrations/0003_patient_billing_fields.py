from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0002_alter_patient_hospital_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="billing_exempt",
            field=models.CharField(
                choices=[
                    ("NONE", "Standard billing"),
                    ("EMPLOYEE", "Hospital employee"),
                    ("OTHER", "Other exempt"),
                ],
                default="NONE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="insurance_coverage_percent",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Used when insurance_type is PARTIAL (0–100).",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="insurance_type",
            field=models.CharField(
                choices=[
                    ("NONE", "No insurance"),
                    ("PARTIAL", "Partial coverage"),
                    ("FULL", "Full coverage"),
                ],
                default="NONE",
                max_length=20,
            ),
        ),
    ]
