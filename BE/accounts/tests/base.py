from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from teams.models import Team, TeamColor, TeamMember, TeamMemberStatus, TeamStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class BaseAccountAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            kakao_id=2001,
            email="tester@example.com",
            nickname="tester",
        )
        self.other_user = User.objects.create_user(
            kakao_id=2002,
            email="taken@example.com",
            nickname="takenname",
        )
        self.team = Team.objects.create(
            name="team-a",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamColor.objects.create(color="112233", team=self.team)
        TeamMember.objects.create(
            team=self.team,
            user=self.user,
            status=TeamMemberStatus.ACTIVE,
        )
        self._authenticate(self.user)

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
