from django.conf import settings
from django.db import models


class BandStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    DELETED = "DELETED", "DELETED"


class BandMemberRole(models.TextChoices):
    OWNER = "OWNER", "OWNER"
    MEMBER = "MEMBER", "MEMBER"


class BandMemberStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    LEFT = "LEFT", "LEFT"


class Band(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=6)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_bands",
    )
    status = models.CharField(
        max_length=20,
        choices=BandStatus.choices,
        default=BandStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teams"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.name


class BandMember(models.Model):
    band = models.ForeignKey(
        Band,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="band_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=BandMemberRole.choices,
        default=BandMemberRole.MEMBER,
    )
    status = models.CharField(
        max_length=20,
        choices=BandMemberStatus.choices,
        default=BandMemberStatus.ACTIVE,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "team_members"
        constraints = [
            models.UniqueConstraint(
                fields=["band", "user"],
                name="uq_team_members_band_user",
            )
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["band", "status"]),
        ]

    def __str__(self):
        return f"{self.band_id}:{self.user_id}"
