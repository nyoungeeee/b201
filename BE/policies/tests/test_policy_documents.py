from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(ROOT_URLCONF="config.urls")
class PolicyDocumentAPITestCase(APITestCase):
    def test_get_terms_of_service(self):
        response = self.client.get("/api/v1/policies/terms/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["type"], "terms")
        self.assertEqual(response.data["title"], "서비스 이용약관")
        self.assertTrue(response.data["content"])

    def test_get_privacy_policy(self):
        response = self.client.get("/api/v1/policies/privacy/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["type"], "privacy")
        self.assertEqual(response.data["title"], "개인정보 처리방침")
        self.assertTrue(response.data["content"])
