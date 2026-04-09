from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from teams.models import Team, TeamMember, TeamMemberStatus, TeamStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class AccountAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(kakao_id=2001, nickname="tester")
        self.other_user = User.objects.create_user(kakao_id=2002, nickname="taken-name")
        self.team = Team.objects.create(
            name="team-a",
            color="112233",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.user,
            status=TeamMemberStatus.ACTIVE,
        )
        self._authenticate(self.user)

    # 활성 사용자의 내 정보 조회 시 팀 정보까지 함께 반환되는지 검증한다.
    def test_get_user_info_returns_profile_and_active_teams(self):
        response = self.client.get("/api/v1/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
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

    # 닉네임 수정 요청이 성공하면 변경된 사용자 정보가 반환되는지 검증한다.
    def test_patch_user_info_updates_nickname(self):
        response = self.client.patch(
            "/api/v1/me/",
            {"nickname": "new-nickname"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.nickname, "new-nickname")
        self.assertEqual(response.data["nickname"], "new-nickname")

    # 이미 사용 중인 닉네임으로 수정하면 충돌 응답이 반환되는지 검증한다.
    def test_patch_user_info_rejects_duplicate_nickname(self):
        response = self.client.patch(
            "/api/v1/me/",
            {"nickname": self.other_user.nickname},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "NICKNAME_ALREADY_EXISTS")

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

    # nickname 누락 시 serializer 검증 오류 응답이 반환되는지 검증한다.
    def test_patch_user_info_requires_nickname(self):
        response = self.client.patch("/api/v1/me/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
