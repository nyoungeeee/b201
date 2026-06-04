from unittest.mock import patch

from rest_framework import status

from .base import BaseAccountAPITestCase, User


class RandomNicknameAPITestCase(BaseAccountAPITestCase):
    def test_random_nickname_allows_unauthenticated_request(self):
        self.client.credentials()

        response = self.client.get("/v1/me/nickname/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("nickname", response.data)

    def test_random_nickname_returns_policy_compliant_nickname(self):
        response = self.client.get("/v1/me/nickname/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nickname = response.data["nickname"]
        self.assertLessEqual(len(nickname), 8)
        self.assertRegex(nickname, r"^[가-힣]+[0-9]$")

    def test_random_nickname_retries_when_candidate_already_exists(self):
        suffix = self._suffix()
        User.objects.create_user(
            kakao_id=int(f"3001{suffix}"),
            email=f"duplicate-{suffix}@example.com",
            nickname="고장난기타7",
        )

        with patch(
            "random.choice", side_effect=["고장난", "기타", "7", "날것의", "기타", "3"]
        ):
            response = self.client.get("/v1/me/nickname/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["nickname"], "날것의기타3")
