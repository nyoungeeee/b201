from dataclasses import dataclass

from accounts.models import User, UserStatus
from accounts.exceptions import NicknameAlreadyExistsError, UserNotFoundError
from teams.models import TeamMemberStatus, TeamStatus


@dataclass
class UserInfo:
    id: int
    email: str | None
    nickname: str
    team: list[dict[str, str]]


class UserInfoService:
    @staticmethod
    def get_user_info(user):
        if not user.is_active or user.status != UserStatus.ACTIVE:
            raise UserNotFoundError()
        return UserInfo(
            id=user.id,
            email=user.email,
            nickname=user.nickname,
            team=UserInfoService._get_active_teams(user),
        )

    @staticmethod
    def patch_user_info(user, nickname):
        if not user.is_active or user.status != UserStatus.ACTIVE:
            raise UserNotFoundError()
        if User.objects.filter(nickname__iexact=nickname).exclude(id=user.id).exists():
            raise NicknameAlreadyExistsError()
        user.nickname = nickname
        user.save(update_fields=["nickname"])
        return UserInfo(
            id=user.id,
            email=user.email,
            nickname=user.nickname,
            team=UserInfoService._get_active_teams(user),
        )

    @staticmethod
    def _get_active_teams(user) -> list[dict[str, int | str]]:
        return [
            {
                "id": team_membership.team.id,
                "name": team_membership.team.name,
                "color": team_membership.team.color,
            }
            for team_membership in user.team_memberships.filter(
                status=TeamMemberStatus.ACTIVE,
                team__status=TeamStatus.ACTIVE,
            )
            .select_related("team", "team__team_color")
            .all()
        ]

    @staticmethod
    def check_nickname_availability(nickname) -> bool:
        return User.objects.filter(nickname__iexact=nickname).exists()
