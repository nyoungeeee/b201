from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from teams.exceptions import (
    AlreadyTeamMemberError,
    DuplicatedTeamColorError,
    DuplicatedTeamNameError,
    ForbiddenTeamAccessError,
    ForbiddenTeamLeaderError,
    InvalidTeamMemberError,
    InvalidTeamColorError,
    NotFoundTeamError,
    NotFoundTeamMemberError,
    NotFoundUserError,
)
from teams.models import (
    Team,
    TeamColor,
    TeamMember,
    TeamMemberRole,
    TeamMemberStatus,
    TeamStatus,
)

User = get_user_model()


@dataclass
class TeamMemberInfo:
    id: int
    nickname: str | None
    role: str


@dataclass
class TeamMemberList:
    members: list[TeamMemberInfo]


@dataclass
class TeamConfig:
    id: int
    name: str
    color: str


@dataclass
class TeamColorInfo:
    color: str
    available: bool


@dataclass
class TeamColorList:
    colors: list[TeamColorInfo]


class TeamQueryService:
    @staticmethod
    def get_members(user, team_id: int) -> TeamMemberList:
        team = TeamQueryService._get_active_team(team_id)
        TeamQueryService._validate_active_member(user=user, team=team)

        memberships = (
            team.team_members.filter(status=TeamMemberStatus.ACTIVE)
            .select_related("user")
            .order_by("joined_at", "id")
        )
        return TeamMemberList(
            members=[
                TeamMemberInfo(
                    id=membership.user_id,
                    nickname=membership.user.nickname,
                    role=TeamQueryService._resolve_role(team, membership),
                )
                for membership in memberships
            ]
        )

    @staticmethod
    def get_colors(user, team_id: int | None = None) -> TeamColorList:
        current_team_id = None
        if team_id is not None:
            team = TeamQueryService._get_active_team(team_id)
            TeamQueryService._validate_active_member(user=user, team=team)
            current_team_id = team.id

        colors = (
            TeamColor.objects.filter(is_active=True)
            .select_related("team")
            .order_by("display_order", "id")
        )
        return TeamColorList(
            colors=[
                TeamColorInfo(
                    color=color.color,
                    available=(
                        color.team_id is None
                        or color.team_id == current_team_id
                        or color.team.status != TeamStatus.ACTIVE
                    ),
                )
                for color in colors
            ]
        )

    @staticmethod
    def _get_active_team(team_id: int) -> Team:
        try:
            return Team.objects.get(id=team_id, status=TeamStatus.ACTIVE)
        except Team.DoesNotExist:
            raise NotFoundTeamError()

    @staticmethod
    def _validate_active_member(user, team: Team) -> TeamMember:
        try:
            return TeamMember.objects.get(
                team=team,
                user=user,
                status=TeamMemberStatus.ACTIVE,
            )
        except TeamMember.DoesNotExist:
            raise ForbiddenTeamAccessError()

    @staticmethod
    def _validate_team_leader(user, team: Team) -> TeamMember:
        membership = TeamQueryService._validate_active_member(user=user, team=team)
        if team.owner_id != user.id and membership.role != TeamMemberRole.LEADER:
            raise ForbiddenTeamLeaderError()
        return membership

    @staticmethod
    def _resolve_role(team: Team, membership: TeamMember) -> str:
        if team.owner_id == membership.user_id:
            return TeamMemberRole.LEADER
        return membership.role


class TeamCommandService:
    @staticmethod
    @transaction.atomic
    def add_member(user, team_id: int, target_nickname: str) -> TeamMemberList:
        team = TeamQueryService._get_active_team(team_id)
        TeamQueryService._validate_team_leader(user=user, team=team)
        target_user = TeamCommandService._get_active_user_by_nickname(target_nickname)

        membership, created = TeamMember.objects.get_or_create(
            team=team,
            user=target_user,
            defaults={
                "role": TeamMemberRole.MEMBER,
                "status": TeamMemberStatus.ACTIVE,
            },
        )
        if not created and membership.status == TeamMemberStatus.ACTIVE:
            raise AlreadyTeamMemberError()

        if not created:
            membership.status = TeamMemberStatus.ACTIVE
            membership.role = TeamMemberRole.MEMBER
            membership.save(update_fields=["status", "role"])

        return TeamQueryService.get_members(user=user, team_id=team.id)

    @staticmethod
    @transaction.atomic
    def remove_member(user, team_id: int, target_user_id: int) -> TeamMemberList:
        team = TeamQueryService._get_active_team(team_id)
        TeamQueryService._validate_team_leader(user=user, team=team)

        if team.owner_id == target_user_id:
            raise InvalidTeamMemberError("팀장은 제거할 수 없습니다.")

        try:
            membership = TeamMember.objects.get(
                team=team,
                user_id=target_user_id,
                status=TeamMemberStatus.ACTIVE,
            )
        except TeamMember.DoesNotExist:
            raise NotFoundTeamMemberError()

        membership.status = TeamMemberStatus.LEFT
        membership.role = TeamMemberRole.MEMBER
        membership.save(update_fields=["status", "role"])
        return TeamQueryService.get_members(user=user, team_id=team.id)

    @staticmethod
    @transaction.atomic
    def delegate_leader(user, team_id: int, target_user_id: int) -> TeamConfig:
        team = TeamQueryService._get_active_team(team_id)
        current_membership = TeamQueryService._validate_team_leader(
            user=user, team=team
        )

        try:
            target_membership = TeamMember.objects.get(
                team=team,
                user_id=target_user_id,
                status=TeamMemberStatus.ACTIVE,
            )
        except TeamMember.DoesNotExist:
            raise NotFoundTeamMemberError()

        if target_user_id == user.id:
            raise InvalidTeamMemberError("현재 팀장에게 다시 위임할 수 없습니다.")

        current_membership.role = TeamMemberRole.MEMBER
        current_membership.save(update_fields=["role"])
        target_membership.role = TeamMemberRole.LEADER
        target_membership.save(update_fields=["role"])

        team.owner = target_membership.user
        team.save(update_fields=["owner", "updated_at"])
        return TeamConfig(id=team.id, name=team.name, color=team.color)

    @staticmethod
    @transaction.atomic
    def update_config(
        user,
        team_id: int,
        name: str | None = None,
        color: str | None = None,
    ) -> TeamConfig:
        team = TeamQueryService._get_active_team(team_id)
        TeamQueryService._validate_team_leader(user=user, team=team)

        if name is not None:
            if Team.objects.filter(name=name).exclude(id=team.id).exists():
                raise DuplicatedTeamNameError()
            team.name = name
        if color is not None:
            TeamCommandService._assign_color(color=color, team=team)

        try:
            team.save(update_fields=["name", "updated_at"])
        except IntegrityError as e:
            raise DuplicatedTeamNameError() from e
        return TeamConfig(id=team.id, name=team.name, color=team.color)

    @staticmethod
    def _assign_color(color: str, team: Team) -> None:
        try:
            target_color = TeamColor.objects.select_for_update().get(
                color=color,
                is_active=True,
            )
        except TeamColor.DoesNotExist:
            raise InvalidTeamColorError()

        assigned_to_active_team = (
            target_color.team_id is not None
            and target_color.team_id != team.id
            and Team.objects.filter(
                id=target_color.team_id,
                status=TeamStatus.ACTIVE,
            ).exists()
        )
        if assigned_to_active_team:
            raise DuplicatedTeamColorError()

        try:
            TeamColor.objects.select_for_update().filter(team=team).exclude(
                id=target_color.id
            ).update(team=None)
            target_color.team = team
            target_color.save(update_fields=["team"])
        except IntegrityError as e:
            raise DuplicatedTeamColorError() from e

    @staticmethod
    def _get_active_user(user_id: int):
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise NotFoundUserError()

    @staticmethod
    def _get_active_user_by_nickname(nickname: str):
        try:
            return User.objects.get(nickname__iexact=nickname, is_active=True)
        except User.DoesNotExist:
            raise NotFoundUserError()
