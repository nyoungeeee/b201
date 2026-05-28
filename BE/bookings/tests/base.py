from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from teams.models import Team, TeamColor, TeamMember, TeamMemberStatus, TeamStatus
from studios.models import StudioRoom, StudioRoomStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class BaseBookingAPITestCase(APITestCase):
    def _suffix(self):
        return str(abs(hash(self.id())) % 1_000_000)

    def setUp(self):
        suffix = self._suffix()
        color_base = int(suffix) % 0xFFFF00
        self.user = User.objects.create_user(
            kakao_id=int(f"3001{suffix}"),
            nickname=f"tester-{suffix}",
        )
        self.member_user = User.objects.create_user(
            kakao_id=int(f"3002{suffix}"),
            nickname=f"member-{suffix}",
        )
        self.other_user = User.objects.create_user(
            kakao_id=int(f"3003{suffix}"),
            nickname=f"other-{suffix}",
        )

        self.room = StudioRoom.objects.create(
            name=f"b201-{suffix}",
            open_time=time(9, 0),
            close_time=time(22, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
        )
        self.inactive_room = StudioRoom.objects.create(
            name=f"b202-{suffix}",
            open_time=time(9, 0),
            close_time=time(22, 0),
            is_24_hours=False,
            status=StudioRoomStatus.INACTIVE,
        )
        self.overnight_room = StudioRoom.objects.create(
            name=f"b203-{suffix}",
            open_time=time(9, 0),
            close_time=time(3, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
        )
        self.full_day_room = StudioRoom.objects.create(
            name=f"b204-{suffix}",
            open_time=time(9, 0),
            close_time=time(9, 0),
            is_24_hours=True,
            status=StudioRoomStatus.ACTIVE,
        )

        self.team = Team.objects.create(
            name=f"team-a-{suffix}",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamColor.objects.create(color=f"{color_base:06X}", team=self.team)
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
            name=f"team-b-{suffix}",
            owner=self.other_user,
            status=TeamStatus.ACTIVE,
        )
        TeamColor.objects.create(color=f"{color_base + 1:06X}", team=self.other_team)
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
