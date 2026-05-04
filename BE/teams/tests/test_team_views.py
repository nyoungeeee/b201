from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from teams.models import Team, TeamMember, TeamMemberRole, TeamMemberStatus, TeamStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class TeamAPITestCase(APITestCase):
    def setUp(self):
        self.leader = User.objects.create_user(kakao_id=4101, nickname="leader")
        self.member = User.objects.create_user(kakao_id=4102, nickname="member")
        self.new_user = User.objects.create_user(kakao_id=4103, nickname="newbie")
        self.other_user = User.objects.create_user(kakao_id=4104, nickname="other")

        self.team = Team.objects.create(
            name="team-a",
            color="000000",
            owner=self.leader,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.leader,
            role=TeamMemberRole.LEADER,
            status=TeamMemberStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.member,
            role=TeamMemberRole.MEMBER,
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
            role=TeamMemberRole.LEADER,
            status=TeamMemberStatus.ACTIVE,
        )

        self._authenticate(self.leader)

    def test_get_team_members(self):
        response = self.client.get(f"/api/v1/teams/{self.team.id}/members/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["members"]), 2)
        self.assertEqual(response.data["members"][0]["role"], TeamMemberRole.LEADER)

    def test_add_team_member(self):
        response = self.client.post(
            f"/api/v1/teams/{self.team.id}/members/",
            {"nickname": self.new_user.nickname},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            TeamMember.objects.filter(
                team=self.team,
                user=self.new_user,
                status=TeamMemberStatus.ACTIVE,
            ).exists()
        )

    def test_remove_team_member(self):
        response = self.client.delete(
            f"/api/v1/teams/{self.team.id}/members/{self.member.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership = TeamMember.objects.get(team=self.team, user=self.member)
        self.assertEqual(membership.status, TeamMemberStatus.LEFT)

    def test_delegate_team_leader(self):
        response = self.client.patch(
            f"/api/v1/teams/{self.team.id}/leader/",
            {"user_id": self.member.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.owner_id, self.member.id)
        self.assertEqual(response.data["id"], self.team.id)

    def test_update_team_config(self):
        response = self.client.patch(
            f"/api/v1/teams/{self.team.id}/config/",
            {"name": "team-renamed", "color": "#AABBCC"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.name, "team-renamed")
        self.assertEqual(self.team.color, "AABBCC")

    def test_member_cannot_add_team_member(self):
        self._authenticate(self.member)

        response = self.client.post(
            f"/api/v1/teams/{self.team.id}/members/",
            {"nickname": self.new_user.nickname},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
