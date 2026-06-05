from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import requests
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status

from auth_tokens.models import RefreshToken
from auth_tokens.exceptions import KakaoAPIError
from auth_tokens.services import KakaoAuthService, KakaoUserInfo
from .base import BaseAuthTokenAPITestCase, User


@override_settings(
    KAKAO_REST_API_KEY="test-key",
    KAKAO_CLIENT_SECRET="test-secret",
    KAKAO_REDIRECT_URI="https://api.b201.kr/auth/kakao/callback",
    USER_FRONTEND_URL="https://b201.kr",
    ADMIN_FRONTEND_URL="https://admin.b201.kr",
    JWT_ACCESS_COOKIE_NAME="access_token",
    JWT_REFRESH_COOKIE_NAME="refresh_token",
    JWT_COOKIE_SECURE=True,
    JWT_COOKIE_HTTPONLY=True,
    JWT_COOKIE_SAMESITE="None",
)
class KakaoBackendCallbackAPITestCase(BaseAuthTokenAPITestCase):
    def tearDown(self):
        cache.clear()
        super().tearDown()

    def test_login_redirects_to_kakao_authorize_with_cached_state(self):
        response = self.client.get("/auth/kakao/login?client=user&next=/my")

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        location = response["Location"]
        parsed = urlparse(location)
        query = parse_qs(parsed.query)

        self.assertEqual(parsed.scheme, "https")
        self.assertEqual(parsed.netloc, "kauth.kakao.com")
        self.assertEqual(parsed.path, "/oauth/authorize")
        self.assertEqual(query["client_id"], ["test-key"])
        self.assertEqual(
            query["redirect_uri"], ["https://api.b201.kr/auth/kakao/callback"]
        )
        self.assertEqual(query["response_type"], ["code"])

        state = query["state"][0]
        self.assertEqual(
            cache.get(f"oauth:kakao:state:{state}"),
            {
                "client": "user",
                "next": "/my",
            },
        )

    def test_login_rejects_invalid_client(self):
        response = self.client.get("/auth/kakao/login?client=owner&next=/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_rejects_external_next(self):
        for next_value in ("https://evil.test", "//evil.test", "javascript:alert(1)"):
            with self.subTest(next=next_value):
                response = self.client.get(
                    "/auth/kakao/login",
                    {"client": "user", "next": next_value},
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_info")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    def test_callback_creates_user_sets_jwt_cookies_and_redirects_to_user_frontend(
        self,
        mock_get_access_token,
        mock_get_kakao_user_info,
    ):
        suffix = self._suffix()
        kakao_id = int(f"9999{suffix}")
        cache.set("oauth:kakao:state:state-123", {"client": "user", "next": "/"}, 300)
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_info.return_value = KakaoUserInfo(
            kakao_id=kakao_id,
            email=f"new-{suffix}@example.com",
        )

        response = self.client.get("/auth/kakao/callback?code=code-123&state=state-123")

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response["Location"], "https://b201.kr/")
        self.assertIsNone(cache.get("oauth:kakao:state:state-123"))
        self.assertEqual(RefreshToken.objects.count(), 1)
        self.assertTrue(User.objects.filter(kakao_id=kakao_id).exists())
        mock_get_access_token.assert_called_once_with(
            "code-123",
            "https://api.b201.kr/auth/kakao/callback",
        )

        access_cookie = response.cookies["access_token"]
        refresh_cookie = response.cookies["refresh_token"]
        self.assertTrue(access_cookie["httponly"])
        self.assertTrue(refresh_cookie["httponly"])
        self.assertTrue(access_cookie["secure"])
        self.assertTrue(refresh_cookie["secure"])
        self.assertEqual(access_cookie["samesite"], "None")
        self.assertEqual(refresh_cookie["samesite"], "None")
        self.assertEqual(access_cookie["domain"], "")
        self.assertEqual(refresh_cookie["domain"], "")

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_info")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    def test_callback_redirects_admin_client_to_admin_frontend(
        self,
        mock_get_access_token,
        mock_get_kakao_user_info,
    ):
        cache.set(
            "oauth:kakao:state:state-admin",
            {"client": "admin", "next": "/dashboard"},
            300,
        )
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_info.return_value = KakaoUserInfo(
            kakao_id=self.user.kakao_id,
            email=self.user.email,
        )

        response = self.client.get(
            "/auth/kakao/callback?code=code-123&state=state-admin"
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response["Location"], "https://admin.b201.kr/dashboard")

    def test_callback_rejects_missing_state(self):
        response = self.client.get("/auth/kakao/callback?code=code-123")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_callback_rejects_expired_state(self):
        response = self.client.get("/auth/kakao/callback?code=code-123&state=missing")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_callback_rejects_missing_code(self):
        cache.set("oauth:kakao:state:state-123", {"client": "user", "next": "/"}, 300)

        response = self.client.get("/auth/kakao/callback?state=state-123")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(cache.get("oauth:kakao:state:state-123"))

    def test_callback_rejects_kakao_error_parameter(self):
        cache.set("oauth:kakao:state:state-123", {"client": "user", "next": "/"}, 300)

        response = self.client.get(
            "/auth/kakao/callback?error=access_denied&state=state-123"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(cache.get("oauth:kakao:state:state-123"))

    @patch("auth_tokens.services.requests.post")
    def test_kakao_token_exchange_uses_single_backend_redirect_uri(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "access_token": "kakao-access-token"
        }

        KakaoAuthService._get_access_token(
            "code-123",
            "https://api.b201.kr/auth/kakao/callback",
        )

        self.assertEqual(
            mock_post.call_args.kwargs["data"]["redirect_uri"],
            "https://api.b201.kr/auth/kakao/callback",
        )

    @patch("auth_tokens.services.requests.post")
    def test_callback_returns_500_when_kakao_request_fails(self, mock_post):
        cache.set("oauth:kakao:state:state-123", {"client": "user", "next": "/"}, 300)
        mock_post.side_effect = requests.RequestException("network issue")

        response = self.client.get("/auth/kakao/callback?code=code-123&state=state-123")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch("auth_tokens.services.KakaoAuthService._get_kakao_user_info")
    @patch("auth_tokens.services.KakaoAuthService._get_access_token")
    def test_callback_rejects_withdrawn_user_relogin(
        self,
        mock_get_access_token,
        mock_get_kakao_user_info,
    ):
        self.user.is_active = False
        self.user.status = "WITHDRAWN"
        self.user.save(update_fields=["is_active", "status"])
        cache.set("oauth:kakao:state:state-123", {"client": "user", "next": "/"}, 300)
        mock_get_access_token.return_value = "kakao-access-token"
        mock_get_kakao_user_info.return_value = KakaoUserInfo(
            kakao_id=self.user.kakao_id,
            email=self.user.email,
        )

        response = self.client.get("/auth/kakao/callback?code=code-123&state=state-123")

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
