from unittest.mock import patch

import requests
from rest_framework import status

from auth_tokens.models import RefreshToken
from auth_tokens.exceptions import KakaoAPIError
from auth_tokens.services import KakaoAuthService, KakaoUserInfo
from .base import BaseAuthTokenAPITestCase, User


class AuthSigninAPITestCase(BaseAuthTokenAPITestCase):
    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_info")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    # 카카오 응답을 mock 해서 신규 사용자의 로그인/회원 생성 흐름을 검증한다.
    def test_signin_creates_new_user_with_mocked_kakao_api(
        self,
        mock_get_access_token,
        mock_get_kakao_user_info,
    ):
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_info.return_value = KakaoUserInfo(
            kakao_id=9999,
            email="new@example.com",
        )

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "new@example.com")
        self.assertEqual(response.data["nickname"], None)
        self.assertEqual(response.data["team"], [])
        self.assertIn("access", response.data["token"])
        self.assertIn("refresh", response.data["token"])
        self.assertTrue(User.objects.filter(kakao_id=9999).exists())
        self.assertEqual(RefreshToken.objects.count(), 1)

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_info")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    # 기존 사용자가 로그인할 때 팀 정보와 토큰이 정상 반환되는지 검증한다.
    def test_signin_returns_existing_user_and_active_teams(
        self,
        mock_get_access_token,
        mock_get_kakao_user_info,
    ):
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_info.return_value = KakaoUserInfo(
            kakao_id=self.user.kakao_id,
            email=self.user.email,
        )

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["nickname"], "tester")
        self.assertEqual(len(response.data["team"]), 1)
        self.assertEqual(response.data["team"][0]["id"], self.team.id)
        self.assertEqual(response.data["team"][0]["name"], self.team.name)
        self.assertEqual(response.data["team"][0]["color"], self.team.color)

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

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_info")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    # 탈퇴한 사용자가 같은 카카오 계정으로 다시 로그인하면 거부되는지 검증한다.
    def test_signin_rejects_withdrawn_user_relogin(
        self,
        mock_get_access_token,
        mock_get_kakao_user_info,
    ):
        self.user.is_active = False
        self.user.status = "WITHDRAWN"
        self.user.save(update_fields=["is_active", "status"])
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_info.return_value = KakaoUserInfo(
            kakao_id=self.user.kakao_id,
            email=self.user.email,
        )

        response = self.client.post(
            "/api/v1/auth/signin",
            {"kakao_auth_code": "code-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "USER_NOT_FOUND")
        self.assertEqual(RefreshToken.objects.count(), 0)

    @patch("auth_tokens.services.requests.get")
    def test_kakao_user_info_requires_email(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "id": 1234,
            "kakao_account": {
                "email_needs_agreement": True,
            },
        }

        with self.assertRaises(KakaoAPIError):
            KakaoAuthService._get_kakao_user_info("kakao-access-token")
