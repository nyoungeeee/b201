from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0002_alter_booking_status_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="memo",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="booking",
            name="title",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
