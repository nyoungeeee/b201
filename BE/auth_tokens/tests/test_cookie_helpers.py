from datetime import timedelta

from django.test import SimpleTestCase, override_settings
from rest_framework.response import Response

from auth_tokens.services import TokenStatus
from auth_tokens.views import _set_jwt_cookies


@override_settings(
    SIMPLE_JWT={
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=7),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=13),
    },
    JWT_ACCESS_COOKIE_NAME="access_token",
    JWT_REFRESH_COOKIE_NAME="refresh_token",
    JWT_COOKIE_SECURE=True,
    JWT_COOKIE_HTTPONLY=True,
    JWT_COOKIE_SAMESITE="None",
)
class JwtCookieHelperTestCase(SimpleTestCase):
    def test_cookie_max_age_uses_corresponding_jwt_lifetime(self):
        response = Response()

        _set_jwt_cookies(
            response,
            TokenStatus(access="access-token", refresh="refresh-token"),
        )

        self.assertEqual(response.cookies["access_token"]["max-age"], 7 * 60)
        self.assertEqual(
            response.cookies["refresh_token"]["max-age"], 13 * 24 * 60 * 60
        )
