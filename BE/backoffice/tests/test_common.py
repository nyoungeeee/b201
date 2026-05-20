from types import SimpleNamespace

from django.test import SimpleTestCase

from backoffice.permissions import IsStaffAdmin
from backoffice.services import build_pagination
from backoffice.views import admin_error, admin_success


class BackofficeCommonTestCase(SimpleTestCase):
    def test_admin_success_wraps_data_and_pagination(self):
        response = admin_success(
            data=[{"id": 1}],
            pagination={
                "page": 1,
                "page_size": 20,
                "total_count": 1,
                "total_pages": 1,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "ok": True,
                "data": [{"id": 1}],
                "pagination": {
                    "page": 1,
                    "page_size": 20,
                    "total_count": 1,
                    "total_pages": 1,
                },
            },
        )

    def test_admin_error_uses_200_business_error_shape(self):
        response = admin_error(
            error_code="ALREADY_BLOCKED",
            message="이미 차단된 사용자입니다.",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "ok": False,
                "error_code": "ALREADY_BLOCKED",
                "message": "이미 차단된 사용자입니다.",
            },
        )

    def test_build_pagination_calculates_total_pages(self):
        self.assertEqual(
            build_pagination(page=2, page_size=30, total_count=61),
            {
                "page": 2,
                "page_size": 30,
                "total_count": 61,
                "total_pages": 3,
            },
        )

    def test_is_staff_admin_allows_only_authenticated_staff(self):
        permission = IsStaffAdmin()
        staff_request = SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_staff=True)
        )
        member_request = SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_staff=False)
        )

        self.assertTrue(permission.has_permission(staff_request, None))
        self.assertFalse(permission.has_permission(member_request, None))
