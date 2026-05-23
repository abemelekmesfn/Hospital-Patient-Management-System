from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("triage", "0007_triage_patient_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="visit",
            name="billing_deferred",
            field=models.BooleanField(
                default=False,
                help_text="Emergency: services proceed; payment collected before discharge.",
            ),
        ),
        migrations.AlterField(
            model_name="visit",
            name="status",
            field=models.CharField(
                choices=[
                    ("WAITING_RECEPTION", "Waiting Reception"),
                    ("WAITING_CASHIER", "Waiting Cashier"),
                    ("WAITING_DOCTOR", "Waiting Doctor"),
                    ("IN_CONSULTATION", "In Consultation"),
                    ("WAITING_LAB_RESULTS", "Waiting Lab Results"),
                    ("LAB_RESULTS_READY", "Lab Results Ready"),
                    ("WAITING_PHARMACY", "Waiting Pharmacy"),
                    ("CONSULTATION_COMPLETED", "Consultation Completed"),
                    ("ADMITTED", "Admitted"),
                    ("DISCHARGED", "Discharged"),
                ],
                default="WAITING_RECEPTION",
                max_length=30,
            ),
        ),
    ]
