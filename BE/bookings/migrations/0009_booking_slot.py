import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0008_booking_canceled_by"),
    ]

    operations = [
        migrations.CreateModel(
            name="BookingSlot",
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
                ("reservation_date", models.DateField()),
                ("slot_time", models.TimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="slots",
                        to="bookings.booking",
                    ),
                ),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="booking_slots",
                        to="studios.studioroom",
                    ),
                ),
            ],
            options={
                "db_table": "reservation_slots",
                "ordering": ["reservation_date", "slot_time", "id"],
                "indexes": [
                    models.Index(
                        fields=["booking"],
                        name="reservation_booking_c85a07_idx",
                    ),
                    models.Index(
                        fields=["reservation_date"],
                        name="reservation_reserva_f712c8_idx",
                    ),
                    models.Index(
                        fields=["room", "reservation_date"],
                        name="reservation_room_id_b09c32_idx",
                    ),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("room", "reservation_date", "slot_time"),
                        name="unique_reservation_slot",
                    ),
                ],
            },
        ),
    ]
