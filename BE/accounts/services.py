from dataclasses import dataclass
import random

from accounts.models import User, UserStatus
from accounts.exceptions import (
    NicknameAlreadyExistsError,
    RandomNicknameGenerationError,
    UserNotFoundError,
)
from teams.models import TeamMemberStatus, TeamStatus


@dataclass
class UserInfo:
    id: int
    email: str | None
    nickname: str
    team: list[dict[str, str]]


class UserInfoService:
    RANDOM_NICKNAME_PREFIXES = [
        "고장난",
        "날것의",
        "몽환의",
        "어둠의",
        "조용한",
        "시끄런",
        "부서진",
        "취한",
        "흐린",
        "달리는",
        "차가운",
        "느린",
        "외로운",
        "낡은",
        "새벽의",
        "거친",
        "달달한",
        "지친",
        "젖은",
        "광란의",
        "퇴근한",
        "흔들린",
        "빛바랜",
        "삐걱댄",
        "폭주한",
        "울먹인",
        "멍한",
        "잠긴",
        "고통의",
        "길잃은",
    ]
    RANDOM_NICKNAME_NOUNS = [
        "기타",
        "드러머",
        "베이스",
        "락스타",
        "건반러",
        "박치",
        "음치",
        "야간반",
        "삑사리",
        "리프중독",
        "코드장인",
        "솔로중독",
        "이펙터",
        "디스토션",
        "메탈덕후",
        "펑크덕후",
        "튜닝지옥",
        "합주중",
        "튜닝노예",
        "펜더덕후",
        "밴드부원",
        "딜레이",
        "공간계",
        "장비덕후",
        "떼창중독",
        "리허설",
        "지각러",
        "빡빡이",
        "홍대병",
        "새벽합주",
    ]
    RANDOM_NICKNAME_DIGITS = [str(number) for number in range(10)]
    RANDOM_NICKNAME_MAX_LENGTH = 8
    RANDOM_NICKNAME_MAX_ATTEMPTS = 100

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

    @staticmethod
    def generate_random_nickname() -> str:
        for _ in range(UserInfoService.RANDOM_NICKNAME_MAX_ATTEMPTS):
            nickname = (
                random.choice(UserInfoService.RANDOM_NICKNAME_PREFIXES)
                + random.choice(UserInfoService.RANDOM_NICKNAME_NOUNS)
                + random.choice(UserInfoService.RANDOM_NICKNAME_DIGITS)
            )
            if len(nickname) > UserInfoService.RANDOM_NICKNAME_MAX_LENGTH:
                continue
            if not User.objects.filter(nickname__iexact=nickname).exists():
                return nickname

        raise RandomNicknameGenerationError()
