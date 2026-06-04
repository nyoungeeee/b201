from backoffice.tests.base import BaseBackofficeAPITestCase


class AdminMeAPITestCase(BaseBackofficeAPITestCase):
    def test_admin_me_returns_staff_status_for_admin(self):
        self._authenticate(self.admin_user)

        response = self.client.get("/v1/admin/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["data"], {"is_staff": True})

    def test_admin_me_returns_staff_status_for_member(self):
        self._authenticate(self.member_user)

        response = self.client.get("/v1/admin/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["data"], {"is_staff": False})

    def test_admin_me_requires_authentication(self):
        self.client.credentials()

        response = self.client.get("/v1/admin/me")

        self.assertEqual(response.status_code, 401)
