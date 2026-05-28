from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class BaseBackofficeAPITestCase(APITestCase):
    def _suffix(self):
        return str(abs(hash(self.id())) % 1_000_000)

    def setUp(self):
        suffix = self._suffix()
        self.admin_user = User.objects.create_user(
            kakao_id=int(f"9001{suffix}"),
            email=f"admin-{suffix}@example.com",
            nickname=f"admin-{suffix}",
            is_staff=True,
        )
        self.member_user = User.objects.create_user(
            kakao_id=int(f"9002{suffix}"),
            email=f"member-{suffix}@example.com",
            nickname=f"member-{suffix}",
        )
        self._authenticate(self.admin_user)

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
