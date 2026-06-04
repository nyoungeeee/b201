from rest_framework import status

from .base import BaseAccountAPITestCase


class NicknameCheckAPITestCase(BaseAccountAPITestCase):
    def test_check_nickname_returns_available_true_when_not_used(self):
        response = self.client.get(
            "/v1/me/nickname/check/",
            {"nickname": "newnickname"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["available"], True)

    def test_check_nickname_returns_available_false_when_used(self):
        response = self.client.get(
            "/v1/me/nickname/check/",
            {"nickname": self.other_user.nickname},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["available"], False)

    def test_check_nickname_is_case_insensitive(self):
        response = self.client.get(
            "/v1/me/nickname/check/",
            {"nickname": self.other_user.nickname.upper()},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["available"], False)

    def test_check_nickname_requires_authentication(self):
        self.client.credentials()

        response = self.client.get(
            "/v1/me/nickname/check/",
            {"nickname": "newnickname"},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
