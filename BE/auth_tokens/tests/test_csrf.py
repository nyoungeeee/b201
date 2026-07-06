from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient, APIRequestFactory

from auth_tokens.authentication import CookieJWTAuthentication
from auth_tokens.exceptions import InvalidOrExpiredTokenError


@override_settings(
    ROOT_URLCONF="config.urls",
    JWT_ACCESS_COOKIE_NAME="access_token",
    JWT_REFRESH_COOKIE_NAME="refresh_token",
    CSRF_TRUSTED_ORIGINS=["https://b201.kr"],
)
class CookieJwtCsrfTestCase(SimpleTestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    @patch.object(CookieJWTAuthentication, "get_user", return_value=object())
    @patch.object(
        CookieJWTAuthentication,
        "get_validated_token",
        return_value={"token_type": "access"},
    )
    def test_unsafe_cookie_authentication_rejects_missing_csrf_token(
        self,
        _get_validated_token,
        _get_user,
    ):
        request = APIRequestFactory(enforce_csrf_checks=True).post("/v1/me/", {})
        request.COOKIES["access_token"] = "access-token"

        with self.assertRaises(PermissionDenied):
            CookieJWTAuthentication().authenticate(request)

    @patch.object(CookieJWTAuthentication, "get_user", return_value=object())
    @patch.object(
        CookieJWTAuthentication,
        "get_validated_token",
        return_value={"token_type": "access"},
    )
    def test_safe_cookie_authentication_does_not_require_csrf_token(
        self,
        _get_validated_token,
        _get_user,
    ):
        request = APIRequestFactory(enforce_csrf_checks=True).get("/v1/me/")
        request.COOKIES["access_token"] = "access-token"

        user, token = CookieJWTAuthentication().authenticate(request)

        self.assertIsNotNone(user)
        self.assertEqual(token, {"token_type": "access"})

    def test_csrf_endpoint_issues_cookie_and_response_token(self):
        response = self.client.get("/auth/csrf")

        self.assertEqual(response.status_code, 200)
        self.assertIn("csrfToken", response.data)
        self.assertIn("csrftoken", response.cookies)
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_refresh_rejects_missing_csrf_token(self):
        self.client.cookies["refresh_token"] = "invalid-refresh"

        response = self.client.post("/auth/refresh", {}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_logout_rejects_missing_csrf_token(self):
        self.client.cookies["refresh_token"] = "invalid-refresh"

        response = self.client.post("/auth/logout", {}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_logout_without_auth_cookies_does_not_require_csrf_token(self):
        response = self.client.post("/auth/logout", {}, format="json")

        self.assertEqual(response.status_code, 204)

    def test_valid_csrf_token_reaches_refresh_validation(self):
        csrf_response = self.client.get("/auth/csrf")
        self.client.cookies["refresh_token"] = "invalid-refresh"

        with patch(
            "auth_tokens.views.TokenRefreshService.refresh_tokens",
            side_effect=InvalidOrExpiredTokenError(),
        ):
            response = self.client.post(
                "/auth/refresh",
                {},
                format="json",
                HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
                HTTP_ORIGIN="https://b201.kr",
            )

        self.assertEqual(response.status_code, 400)

    def test_untrusted_origin_is_rejected(self):
        csrf_response = self.client.get("/auth/csrf")
        self.client.cookies["refresh_token"] = "invalid-refresh"

        response = self.client.post(
            "/auth/refresh",
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_response.data["csrfToken"],
            HTTP_ORIGIN="https://evil.example",
        )

        self.assertEqual(response.status_code, 403)
