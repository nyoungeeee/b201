from rest_framework import status

from auth_tokens.models import RefreshToken
from .base import BaseAuthTokenAPITestCase


class AuthWithdrawAPITestCase(BaseAuthTokenAPITestCase):
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
