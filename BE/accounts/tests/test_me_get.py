from rest_framework import status

from teams.models import Team, TeamMember, TeamMemberStatus, TeamStatus
from .base import BaseAccountAPITestCase


class MeGetAPITestCase(BaseAccountAPITestCase):
    # 활성 사용자의 내 정보 조회 시 팀 정보까지 함께 반환되는지 검증한다.
    def test_get_user_info_returns_profile_and_active_teams(self):
        response = self.client.get("/api/v1/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["nickname"], self.user.nickname)
        self.assertEqual(
            response.data["team"], [{"id": self.team.id, "name": self.team.name}]
        )

    # 소속된 활성 팀이 없으면 빈 배열이 반환되는지 검증한다.
    def test_get_user_info_returns_empty_team_list_when_user_has_no_team(self):
        TeamMember.objects.filter(user=self.user).delete()

        response = self.client.get("/api/v1/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["team"], [])

    # 여러 활성 팀에 소속된 경우 모든 팀 정보가 반환되는지 검증한다.
    def test_get_user_info_returns_all_active_teams_when_user_has_many_teams(self):
        another_team = Team.objects.create(
            name="team-b",
            color="445566",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=another_team,
            user=self.user,
            status=TeamMemberStatus.ACTIVE,
        )

        response = self.client.get("/api/v1/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["team"],
            [
                {"id": self.team.id, "name": self.team.name},
                {"id": another_team.id, "name": another_team.name},
            ],
        )

    # 상태가 ACTIVE가 아닌 사용자는 내 정보 조회가 거부되는지 검증한다.
    def test_get_user_info_rejects_non_active_status_user(self):
        self.user.status = "WITHDRAWN"
        self.user.save(update_fields=["status"])

        response = self.client.get("/api/v1/me/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "USER_NOT_FOUND")

    # 인증 없이 접근하면 인증 오류 응답이 반환되는지 검증한다.
    def test_get_user_info_requires_authentication(self):
        self.client.credentials()

        response = self.client.get("/api/v1/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
