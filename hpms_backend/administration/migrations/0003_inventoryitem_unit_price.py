from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("administration", "0002_inventoryitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="inventoryitem",
            name="unit_price",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Selling price per unit in ETB (pharmacy).",
                max_digits=12,
            ),
        ),
    ]
