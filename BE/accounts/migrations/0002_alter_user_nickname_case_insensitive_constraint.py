from django.db import migrations, models
from django.db.models import Q
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="user",
            name="unique_nickname_when_not_null",
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                Lower("nickname"),
                condition=Q(nickname__isnull=False),
                name="unique_nickname_case_insensitive_when_not_null",
            ),
        ),
    ]
