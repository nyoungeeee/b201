from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from auth_tokens.models import RefreshToken
from .base import BaseAuthTokenAPITestCase


class AuthTokenRefreshAPITestCase(BaseAuthTokenAPITestCase):
    # 저장된 refresh 토큰으로 access/refresh 재발급이 정상 동작하는지 검증한다.
    def test_refresh_rotates_token_from_cookie_and_sets_new_cookies(self):
        jwt_refresh = JWTRefreshToken.for_user(self.user)
        refresh_str = str(jwt_refresh)
        RefreshToken.objects.create(
            user=self.user,
            token_hash=self._hash(refresh_str),
        )
        self.client.cookies["refresh_token"] = refresh_str

        response = self.client.post(
            "/auth/refresh",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)
        self.assertEqual(RefreshToken.objects.count(), 1)
        self.assertNotEqual(response.cookies["refresh_token"].value, refresh_str)

    def test_refresh_rejects_missing_refresh_cookie(self):
        response = self.client.post("/auth/refresh", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_access_cookie_authenticates_existing_me_api(self):
        refresh = JWTRefreshToken.for_user(self.user)
        self.client.cookies["access_token"] = str(refresh.access_token)

        response = self.client.get("/v1/me/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)

    def test_bearer_header_authentication_still_works_without_cookie(self):
        refresh = JWTRefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.get("/v1/me/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
