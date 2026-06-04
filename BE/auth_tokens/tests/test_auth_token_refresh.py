from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from auth_tokens.models import RefreshToken
from .base import BaseAuthTokenAPITestCase


class AuthTokenRefreshAPITestCase(BaseAuthTokenAPITestCase):
    # 저장된 refresh 토큰으로 access/refresh 재발급이 정상 동작하는지 검증한다.
    def test_refresh_rotates_token(self):
        jwt_refresh = JWTRefreshToken.for_user(self.user)
        refresh_str = str(jwt_refresh)
        RefreshToken.objects.create(
            user=self.user,
            token_hash=self._hash(refresh_str),
        )

        response = self.client.post(
            "/v1/auth/token/refresh",
            {"refresh": refresh_str},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(RefreshToken.objects.count(), 1)
        self.assertNotEqual(response.data["refresh"], refresh_str)
