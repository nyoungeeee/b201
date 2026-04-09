from django.conf import settings
from django.db import models


class TeamStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    DELETED = "DELETED", "DELETED"


class TeamMemberRole(models.TextChoices):
    LEADER = "LEADER", "LEADER"
    MEMBER = "MEMBER", "MEMBER"


class TeamMemberStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    LEFT = "LEFT", "LEFT"


class Team(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=6)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_teams",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="TeamMember",
        related_name="teams",
    )
    status = models.CharField(
        max_length=20,
        choices=TeamStatus.choices,
        default=TeamStatus.ACTIVE,
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


class TeamMember(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="team_members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=TeamMemberRole.choices,
        default=TeamMemberRole.MEMBER,
    )
    status = models.CharField(
        max_length=20,
        choices=TeamMemberStatus.choices,
        default=TeamMemberStatus.ACTIVE,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "team_members"
        constraints = [
            models.UniqueConstraint(
                fields=["team", "user"],
                name="uq_team_members_team_user",
            )
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["team", "status"]),
        ]

    def __str__(self):
        return f"{self.team_id}:{self.user_id}"
