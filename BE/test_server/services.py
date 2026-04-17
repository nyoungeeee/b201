from dataclasses import dataclass
from typing import Dict, List

from django.db import models

from teams.models import TeamMemberStatus, TeamStatus
from auth_tokens.services import SigninResponse, TokenRefreshService
from accounts.models import User


class TestSigninService:

    @staticmethod
    def _signin_from_nickname(nickname: str) -> User:
        try:
            user = User.objects.get(nickname=nickname)
        except User.DoesNotExist:
            kakao_id = (
                User.objects.aggregate(max_kakao_id=models.Max("kakao_id"))[
                    "max_kakao_id"
                ]
                or 0
            )
            user = User.objects.create_user(
                kakao_id=kakao_id + 1,
                nickname=nickname,
            )
        return user

    def signin(nickname: str, is_staff: bool) -> SigninResponse:
        user = TestSigninService._signin_from_nickname(nickname)
        user.is_staff = is_staff
        user.save()

        token_status = TokenRefreshService.generate_tokens(user)

        return SigninResponse(
            id=user.id,
            nickname=user.nickname,
            team=[
                {"name": team_member.team.name, "id": team_member.team.id}
                for team_member in user.team_memberships.filter(
                    status=TeamMemberStatus.ACTIVE, team__status=TeamStatus.ACTIVE
                ).select_related("team")
            ],
            token=token_status,
        )
