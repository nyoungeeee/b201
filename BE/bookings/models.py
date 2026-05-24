from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from teams.models import Team
from studios.models import StudioRoom


class BookingType(models.TextChoices):
    PRIVATE = "PRIVATE", "PRIVATE"
    TEAM = "TEAM", "TEAM"


class BookingStatus(models.TextChoices):
    RESERVED = "RESERVED", "RESERVED"
    CANCELED = "CANCELED", "CANCELED"
    PENDING = "PENDING", "PENDING"  # 예약 확정 대기 상태 (관리자 승인 필요)
    REJECTED = "REJECTED", "REJECTED"


class Booking(models.Model):
    reservation_number = models.BigAutoField(primary_key=True)

    room = models.ForeignKey(
        StudioRoom,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="bookings",
        blank=True,
        null=True,
    )

    booking_type = models.CharField(
        max_length=20,
        choices=BookingType.choices,
    )
    reservation_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    title = models.CharField(max_length=100, blank=True, null=True)
    memo = models.TextField(blank=True, default="")
    repeat_group_id = models.UUIDField(blank=True, null=True, db_index=True)
    repeat_weekdays = models.JSONField(blank=True, null=True)
    repeat_start_date = models.DateField(blank=True, null=True)
    repeat_end_date = models.DateField(blank=True, null=True)
    canceled_occurrence_dates = models.JSONField(default=list, blank=True)

    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
    canceled_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reservations"
        indexes = [
            models.Index(fields=["room", "reservation_date", "status"]),
            models.Index(fields=["room", "reservation_date", "start_time", "end_time"]),
            models.Index(fields=["user", "status", "reservation_date"]),
            models.Index(fields=["team", "status", "reservation_date"]),
            models.Index(fields=["reservation_date", "status"]),
            models.Index(fields=["repeat_group_id"]),
        ]
        ordering = ["reservation_date", "start_time", "reservation_number"]

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("start_time must be earlier than end_time")

        if self.booking_type == BookingType.PRIVATE and self.team_id is not None:
            raise ValidationError("private booking must not have team")

        if self.booking_type == BookingType.TEAM and self.team_id is None:
            raise ValidationError("team booking must have team")

    def __str__(self):
        return f"{self.reservation_number}"
