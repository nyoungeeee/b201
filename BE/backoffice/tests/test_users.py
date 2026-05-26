from rest_framework import status

from accounts.models import UserStatus
from .base import BaseBackofficeAPITestCase, User


class BackofficeUserAPITestCase(BaseBackofficeAPITestCase):
    def test_staff_can_get_user_list(self):
        response = self.client.get("/api/v1/admin/users")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["pagination"]["total_count"], 2)
        users = {item["id"]: item for item in response.data["data"]}
        self.assertEqual(users[self.admin_user.id]["status"], "normal")
        self.assertEqual(users[self.member_user.id]["team_ids"], [])

    def test_non_staff_cannot_get_user_list(self):
        self._authenticate(self.member_user)

        response = self.client.get("/api/v1/admin/users")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_get_user_detail(self):
        response = self.client.get(f"/api/v1/admin/users/{self.member_user.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "ok": True,
                "data": {
                    "id": self.member_user.id,
                    "nickname": self.member_user.nickname,
                    "email": self.member_user.email,
                    "status": "normal",
                    "joined_at": self.member_user.created_at.date().isoformat(),
                    "team_ids": [],
                },
            },
        )

    def test_staff_can_block_user(self):
        response = self.client.patch(f"/api/v1/admin/users/{self.member_user.id}/block")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        self.member_user.refresh_from_db()
        self.assertEqual(self.member_user.status, UserStatus.BLOCKED)

    def test_block_user_returns_business_error_when_already_blocked(self):
        self.member_user.status = UserStatus.BLOCKED
        self.member_user.save(update_fields=["status"])

        response = self.client.patch(f"/api/v1/admin/users/{self.member_user.id}/block")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "ok": False,
                "error_code": "ALREADY_BLOCKED",
                "message": "이미 차단된 사용자입니다.",
            },
        )

    def test_staff_can_unblock_user(self):
        self.member_user.status = UserStatus.BLOCKED
        self.member_user.save(update_fields=["status"])

        response = self.client.patch(
            f"/api/v1/admin/users/{self.member_user.id}/unblock"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        self.member_user.refresh_from_db()
        self.assertEqual(self.member_user.status, UserStatus.ACTIVE)

    def test_unblock_user_returns_business_error_when_not_blocked(self):
        response = self.client.patch(
            f"/api/v1/admin/users/{self.member_user.id}/unblock"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "ok": False,
                "error_code": "NOT_BLOCKED",
                "message": "차단 상태가 아닌 사용자입니다.",
            },
        )

    def test_get_user_detail_returns_404_when_missing(self):
        response = self.client.get("/api/v1/admin/users/999999")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_list_filters_by_query_and_status(self):
        self.member_user.status = UserStatus.BLOCKED
        self.member_user.save(update_fields=["status"])
        suffix = self._suffix()
        User.objects.create_user(
            kakao_id=int(f"9003{suffix}"),
            email=f"other-{suffix}@example.com",
            nickname=f"other-{suffix}",
        )

        response = self.client.get(
            f"/api/v1/admin/users?q={self.member_user.nickname}&status=blocked"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(response.data["data"][0]["id"], self.member_user.id)
