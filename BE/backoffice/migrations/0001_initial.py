from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminActionLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("category", models.CharField(max_length=20)),
                ("action", models.CharField(max_length=100)),
                ("target", models.CharField(blank=True, default="", max_length=100)),
                ("detail", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "admin",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="admin_action_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "admin_action_logs",
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="adminactionlog",
            index=models.Index(
                fields=["-created_at", "-id"],
                name="admin_actio_created_c9a2af_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="adminactionlog",
            index=models.Index(
                fields=["category", "-created_at", "-id"],
                name="admin_actio_categor_843a8f_idx",
            ),
        ),
    ]
