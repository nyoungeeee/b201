from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken
import requests

from auth_tokens.models import RefreshToken
from teams.models import Team, TeamMember, TeamMemberStatus, TeamStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class AuthTokenAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(kakao_id=1001, nickname="tester")
        self.team = Team.objects.create(
            name="team-a",
            color="000000",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.user,
            status=TeamMemberStatus.ACTIVE,
        )

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_id")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    # 카카오 응답을 mock 해서 신규 사용자의 로그인/회원 생성 흐름을 검증한다.
    def test_signin_creates_new_user_with_mocked_kakao_api(
        self,
        mock_get_access_token,
        mock_get_kakao_user_id,
    ):
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_id.return_value = 9999

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nickname"], None)
        self.assertEqual(response.data["team"], [])
        self.assertIn("access", response.data["token"])
        self.assertIn("refresh", response.data["token"])
        self.assertTrue(User.objects.filter(kakao_id=9999).exists())
        self.assertEqual(RefreshToken.objects.count(), 1)

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_id")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    # 기존 사용자가 로그인할 때 팀 정보와 토큰이 정상 반환되는지 검증한다.
    def test_signin_returns_existing_user_and_active_teams(
        self,
        mock_get_access_token,
        mock_get_kakao_user_id,
    ):
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_id.return_value = self.user.kakao_id

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["nickname"], "tester")
        self.assertEqual(len(response.data["team"]), 1)
        self.assertEqual(response.data["team"][0]["id"], self.team.id)
        self.assertEqual(response.data["team"][0]["name"], self.team.name)

    @patch("auth_tokens.services.requests.post")
    # 카카오 토큰 요청 실패 시 서버 오류 응답으로 변환되는지 검증한다.
    def test_signin_returns_500_when_kakao_request_fails(self, mock_post):
        mock_post.side_effect = requests.RequestException("network issue")

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 저장된 refresh 토큰으로 access/refresh 재발급이 정상 동작하는지 검증한다.
    def test_refresh_rotates_token(self):
        jwt_refresh = JWTRefreshToken.for_user(self.user)
        refresh_str = str(jwt_refresh)
        RefreshToken.objects.create(
            user=self.user,
            token_hash=self._hash(refresh_str),
        )

        response = self.client.post(
            "/api/v1/auth/token/refresh",
            {"refresh": refresh_str},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(RefreshToken.objects.count(), 1)
        self.assertNotEqual(response.data["refresh"], refresh_str)

    # 로그아웃 시 사용자의 refresh 토큰들이 모두 삭제되는지 검증한다.
    def test_logout_removes_user_refresh_tokens(self):
        self._authenticate(self.user)
        RefreshToken.objects.create(user=self.user, token_hash="hash-1")
        RefreshToken.objects.create(user=self.user, token_hash="hash-2")

        response = self.client.post("/api/v1/auth/logout", format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(RefreshToken.objects.filter(user=self.user).count(), 0)

    # 회원탈퇴 시 계정 상태 변경과 refresh 토큰 삭제가 함께 처리되는지 검증한다.
    def test_withdraw_marks_user_withdrawn_and_deletes_tokens(self):
        self._authenticate(self.user)
        RefreshToken.objects.create(user=self.user, token_hash="hash-1")

        response = self.client.post("/api/v1/auth/withdraw", format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.user.status, "WITHDRAWN")
        self.assertIsNotNone(self.user.deleted_at)
        self.assertEqual(RefreshToken.objects.filter(user=self.user).count(), 0)

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_id")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    # 탈퇴한 사용자가 같은 카카오 계정으로 다시 로그인하면 거부되는지 검증한다.
    def test_signin_rejects_withdrawn_user_relogin(
        self,
        mock_get_access_token,
        mock_get_kakao_user_id,
    ):
        self.user.is_active = False
        self.user.status = "WITHDRAWN"
        self.user.save(update_fields=["is_active", "status"])
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_id.return_value = self.user.kakao_id

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "USER_NOT_FOUND")
        self.assertEqual(RefreshToken.objects.count(), 0)

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def _hash(self, value: str) -> str:
        import hashlib

        return hashlib.sha256(value.encode()).hexdigest()
