from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class BaseBackofficeAPITestCase(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            kakao_id=9001,
            email="admin@example.com",
            nickname="admin",
            is_staff=True,
        )
        self.member_user = User.objects.create_user(
            kakao_id=9002,
            email="member@example.com",
            nickname="member",
        )
        self._authenticate(self.admin_user)

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
