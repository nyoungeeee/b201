from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "bookings",
            "0005_rename_reservatio_repeat__0476a7_idx_reservation_repeat__7497e3_idx",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("RESERVED", "RESERVED"),
                    ("CANCELED", "CANCELED"),
                    ("PENDING", "PENDING"),
                    ("REJECTED", "REJECTED"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
    ]
