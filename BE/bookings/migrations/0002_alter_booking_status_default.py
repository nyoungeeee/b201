from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0001_initial"),
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
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
    ]
