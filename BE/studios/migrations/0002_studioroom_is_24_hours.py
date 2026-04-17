from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("studios", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studioroom",
            name="is_24_hours",
            field=models.BooleanField(default=False),
        ),
    ]
