from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from teams.models import Team, TeamMember, TeamMemberStatus, TeamStatus
from studios.models import StudioRoom, StudioRoomStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class BaseBookingAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(kakao_id=3001, nickname="tester")
        self.member_user = User.objects.create_user(kakao_id=3002, nickname="member")
        self.other_user = User.objects.create_user(kakao_id=3003, nickname="other")

        self.room = StudioRoom.objects.create(
            name="b201",
            open_time=time(9, 0),
            close_time=time(22, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
        )
        self.inactive_room = StudioRoom.objects.create(
            name="b202",
            open_time=time(9, 0),
            close_time=time(22, 0),
            is_24_hours=False,
            status=StudioRoomStatus.INACTIVE,
        )
        self.overnight_room = StudioRoom.objects.create(
            name="b203",
            open_time=time(9, 0),
            close_time=time(3, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
        )
        self.full_day_room = StudioRoom.objects.create(
            name="b204",
            open_time=time(9, 0),
            close_time=time(9, 0),
            is_24_hours=True,
            status=StudioRoomStatus.ACTIVE,
        )

        self.team = Team.objects.create(
            name="team-a",
            color="000000",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.user,
            status=TeamMemberStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.member_user,
            status=TeamMemberStatus.ACTIVE,
        )

        self.other_team = Team.objects.create(
            name="team-b",
            color="111111",
            owner=self.other_user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.other_team,
            user=self.other_user,
            status=TeamMemberStatus.ACTIVE,
        )

        self.today = date.today()
        self.tomorrow = self.today + timedelta(days=1)
        self._authenticate(self.user)

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
