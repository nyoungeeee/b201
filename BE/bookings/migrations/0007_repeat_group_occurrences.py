import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("bookings", "0006_add_rejected_booking_status"),
        ("studios", "0001_initial"),
        ("teams", "0002_teamcolor_remove_team_color"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReservationRepeatGroup",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "booking_type",
                    models.CharField(
                        choices=[("PRIVATE", "PRIVATE"), ("TEAM", "TEAM")],
                        max_length=20,
                    ),
                ),
                ("start_time", models.TimeField()),
                ("end_time", models.TimeField()),
                ("repeat_start_date", models.DateField()),
                ("repeat_end_date", models.DateField()),
                ("repeat_weekdays", models.JSONField(blank=True, null=True)),
                ("memo", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="reservation_repeat_groups",
                        to="studios.studioroom",
                    ),
                ),
                (
                    "team",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="reservation_repeat_groups",
                        to="teams.team",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="reservation_repeat_groups",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "reservation_repeat_groups",
            },
        ),
        migrations.CreateModel(
            name="ReservationRepeatOccurrence",
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
                ("week", models.PositiveIntegerField()),
                ("date", models.DateField()),
                ("start_time", models.TimeField()),
                ("end_time", models.TimeField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "PENDING"),
                            ("RESERVED", "RESERVED"),
                            ("CONFLICT", "CONFLICT"),
                            ("CANCELED", "CANCELED"),
                            ("REJECTED", "REJECTED"),
                            ("REAPPLIED", "REAPPLIED"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "reason_code",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                ("canceled_at", models.DateTimeField(blank=True, null=True)),
                (
                    "booking",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="repeat_occurrences",
                        to="bookings.booking",
                    ),
                ),
                (
                    "canceled_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="canceled_repeat_occurrences",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "conflict_booking",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="conflict_repeat_occurrences",
                        to="bookings.booking",
                    ),
                ),
                (
                    "reapplied_booking",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reapplied_repeat_occurrences",
                        to="bookings.booking",
                    ),
                ),
                (
                    "repeat_group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="occurrences",
                        to="bookings.reservationrepeatgroup",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "reservation_repeat_occurrences",
            },
        ),
        migrations.AddConstraint(
            model_name="reservationrepeatoccurrence",
            constraint=models.UniqueConstraint(
                fields=("repeat_group", "week"),
                name="unique_repeat_occurrence_week",
            ),
        ),
        migrations.AddConstraint(
            model_name="reservationrepeatoccurrence",
            constraint=models.UniqueConstraint(
                fields=("repeat_group", "date"),
                name="unique_repeat_occurrence_date",
            ),
        ),
        migrations.AddIndex(
            model_name="reservationrepeatoccurrence",
            index=models.Index(
                fields=["repeat_group", "week"],
                name="reservation_repeat__d063d5_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="reservationrepeatoccurrence",
            index=models.Index(
                fields=["status", "date"],
                name="reservation_status_e032ec_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="reservationrepeatoccurrence",
            index=models.Index(
                fields=["booking"],
                name="reservation_booking_acdf66_idx",
            ),
        ),
    ]
