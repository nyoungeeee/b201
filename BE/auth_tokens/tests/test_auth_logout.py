from rest_framework import status

from auth_tokens.models import RefreshToken
from .base import BaseAuthTokenAPITestCase


class AuthLogoutAPITestCase(BaseAuthTokenAPITestCase):
    # 로그아웃 시 사용자의 refresh 토큰들이 모두 삭제되는지 검증한다.
    def test_logout_removes_user_refresh_tokens(self):
        self._authenticate(self.user)
        RefreshToken.objects.create(user=self.user, token_hash="hash-1")
        RefreshToken.objects.create(user=self.user, token_hash="hash-2")

        response = self.client.post("/auth/logout", format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(RefreshToken.objects.filter(user=self.user).count(), 0)
        self.assertEqual(response.cookies["access_token"].value, "")
        self.assertEqual(response.cookies["refresh_token"].value, "")
