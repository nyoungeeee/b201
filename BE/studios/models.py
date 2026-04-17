from django.db import models


class StudioRoomStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    INACTIVE = "INACTIVE", "INACTIVE"


class ClosureType(models.TextChoices):
    BLOCKED = "BLOCKED", "BLOCKED"
    HOLIDAY = "HOLIDAY", "HOLIDAY"
    MAINTENANCE = "MAINTENANCE", "MAINTENANCE"


class StudioRoom(models.Model):
    name = models.CharField(max_length=30, unique=True)
    description = models.CharField(max_length=500, blank=True, null=True)
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_24_hours = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=StudioRoomStatus.choices,
        default=StudioRoomStatus.ACTIVE,
    )
    sort_order = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rooms"
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(fields=["status", "sort_order"]),
        ]

    def __str__(self):
        return self.name


class RoomClosure(models.Model):
    room = models.ForeignKey(
        StudioRoom,
        on_delete=models.CASCADE,
        related_name="closures",
    )
    closure_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    closure_type = models.CharField(
        max_length=20,
        choices=ClosureType.choices,
        default=ClosureType.BLOCKED,
    )
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "room_closures"
        indexes = [
            models.Index(fields=["room", "closure_date"]),
            models.Index(fields=["room", "closure_date", "start_time", "end_time"]),
        ]

    def __str__(self):
        return f"{self.room_id}:{self.closure_date}"
