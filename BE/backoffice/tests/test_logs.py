from rest_framework import status

from backoffice.models import AdminActionLog
from .base import BaseBackofficeAPITestCase


class BackofficeLogAPITestCase(BaseBackofficeAPITestCase):
    def test_staff_can_get_logs_with_cursor_pagination(self):
        first_log = AdminActionLog.objects.create(
            admin=self.admin_user,
            category="사용자",
            action="사용자를 차단했습니다",
            target=self.member_user.nickname,
            detail="",
        )
        second_log = AdminActionLog.objects.create(
            admin=self.admin_user,
            category="팀",
            action="팀을 생성했습니다",
            target="A팀",
            detail="",
        )

        first_response = self.client.get("/v1/admin/logs?page_size=1")

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertTrue(first_response.data["ok"])
        self.assertEqual(first_response.data["data"][0]["id"], second_log.id)
        self.assertTrue(first_response.data["pagination"]["has_next"])
        self.assertIsNotNone(first_response.data["pagination"]["next_cursor"])

        second_response = self.client.get(
            "/v1/admin/logs",
            {
                "page_size": 1,
                "cursor": first_response.data["pagination"]["next_cursor"],
            },
        )

        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.data["data"][0]["id"], first_log.id)
        self.assertFalse(second_response.data["pagination"]["has_next"])

    def test_log_list_filters_by_category(self):
        AdminActionLog.objects.create(
            admin=self.admin_user,
            category="사용자",
            action="사용자를 차단했습니다",
            target=self.member_user.nickname,
            detail="",
        )
        AdminActionLog.objects.create(
            admin=self.admin_user,
            category="팀",
            action="팀을 생성했습니다",
            target="A팀",
            detail="",
        )

        response = self.client.get("/v1/admin/logs?category=사용자")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["page_size"], 30)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["category"], "사용자")

    def test_log_list_rejects_invalid_cursor(self):
        response = self.client.get("/v1/admin/logs?cursor=not-a-cursor")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")
        self.assertIn("cursor", response.data["errors"])

    def test_admin_user_block_records_action_log(self):
        response = self.client.patch(f"/v1/admin/users/{self.member_user.id}/block")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        log = AdminActionLog.objects.get(category="사용자")
        self.assertEqual(log.admin_id, self.admin_user.id)
        self.assertEqual(log.action, "사용자를 차단했습니다")
        self.assertEqual(log.target, self.member_user.nickname)
