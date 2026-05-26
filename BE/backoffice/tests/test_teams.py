from rest_framework import status

from accounts.models import UserStatus
from teams.models import (
    Team,
    TeamColor,
    TeamMember,
    TeamMemberRole,
    TeamMemberStatus,
    TeamStatus,
)
from .base import BaseBackofficeAPITestCase, User


class BackofficeTeamAPITestCase(BaseBackofficeAPITestCase):
    def setUp(self):
        super().setUp()
        suffix = self._suffix()
        color_base = int(suffix) % 0xFFFF00
        self.color_a_value = f"{color_base:06X}"
        self.color_b_value = f"{color_base + 1:06X}"
        self.color_c_value = f"{color_base + 2:06X}"
        self.color_a = TeamColor.objects.create(
            color=self.color_a_value, display_order=1
        )
        self.color_b = TeamColor.objects.create(
            color=self.color_b_value, display_order=2
        )
        self.color_c = TeamColor.objects.create(
            color=self.color_c_value, display_order=3
        )
        self.leader = User.objects.create_user(
            kakao_id=int(f"9101{suffix}"),
            email=f"leader-{suffix}@example.com",
            nickname=f"leader-{suffix}",
        )
        self.team = Team.objects.create(
            name=f"team-a-{suffix}",
            owner=self.leader,
            status=TeamStatus.ACTIVE,
        )
        self.color_a.team = self.team
        self.color_a.save(update_fields=["team"])
        TeamMember.objects.create(
            team=self.team,
            user=self.leader,
            role=TeamMemberRole.LEADER,
            status=TeamMemberStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.member_user,
            role=TeamMemberRole.MEMBER,
            status=TeamMemberStatus.ACTIVE,
        )

    def test_staff_can_get_team_colors_with_availability(self):
        response = self.client.get(f"/api/v1/admin/teams/colors?team_id={self.team.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        colors = {item["id"]: item for item in response.data["data"]}
        self.assertEqual(colors[self.color_a.id]["value"], f"#{self.color_a_value}")
        self.assertTrue(colors[self.color_a.id]["available"])
        self.assertTrue(colors[self.color_b.id]["available"])

    def test_staff_can_get_team_list(self):
        response = self.client.get("/api/v1/admin/teams")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(response.data["data"][0]["id"], self.team.id)
        self.assertEqual(response.data["data"][0]["leader_id"], self.leader.id)
        self.assertEqual(response.data["data"][0]["member_count"], 2)

    def test_staff_can_get_team_detail(self):
        response = self.client.get(f"/api/v1/admin/teams/{self.team.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["id"], self.team.id)
        self.assertEqual(response.data["data"]["color_id"], self.color_a.id)
        self.assertEqual(response.data["data"]["color_value"], f"#{self.color_a_value}")
        self.assertEqual(
            response.data["data"]["member_ids"], [self.leader.id, self.member_user.id]
        )
        self.assertTrue(response.data["data"]["members"][0]["is_leader"])

    def test_staff_can_create_team_with_current_admin_as_leader_for_zero(self):
        team_name = f"team-b-{self._suffix()}"
        response = self.client.post(
            "/api/v1/admin/teams",
            {"name": team_name, "color_id": self.color_b.id, "leader_id": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["ok"])
        team = Team.objects.get(name=team_name)
        self.assertEqual(team.owner_id, self.admin_user.id)
        self.assertEqual(team.color, self.color_b_value)
        self.assertTrue(
            TeamMember.objects.filter(
                team=team,
                user=self.admin_user,
                role=TeamMemberRole.LEADER,
                status=TeamMemberStatus.ACTIVE,
            ).exists()
        )

    def test_create_team_returns_business_error_for_duplicate_name(self):
        response = self.client.post(
            "/api/v1/admin/teams",
            {"name": self.team.name, "color_id": self.color_b.id, "leader_id": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "DUPLICATE_TEAM_NAME")

    def test_staff_can_update_team_name_and_color(self):
        team_name = f"team-renamed-{self._suffix()}"
        response = self.client.patch(
            f"/api/v1/admin/teams/{self.team.id}",
            {"name": team_name, "color_id": self.color_b.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.name, team_name)
        self.assertEqual(self.team.color, self.color_b_value)

    def test_staff_can_delete_team(self):
        response = self.client.delete(f"/api/v1/admin/teams/{self.team.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        self.team.refresh_from_db()
        self.assertEqual(self.team.status, TeamStatus.DELETED)

    def test_add_team_members_rejects_blocked_user(self):
        suffix = self._suffix()
        blocked_user = User.objects.create_user(
            kakao_id=int(f"9102{suffix}"),
            nickname=f"blocked-{suffix}",
        )
        blocked_user.status = UserStatus.BLOCKED
        blocked_user.save(update_fields=["status"])

        response = self.client.post(
            f"/api/v1/admin/teams/{self.team.id}/members",
            {"user_ids": [blocked_user.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "BLOCKED_USER_INCLUDED")

    def test_staff_can_add_team_members(self):
        suffix = self._suffix()
        new_user = User.objects.create_user(
            kakao_id=int(f"9103{suffix}"),
            nickname=f"newbie-{suffix}",
        )

        response = self.client.post(
            f"/api/v1/admin/teams/{self.team.id}/members",
            {"user_ids": [new_user.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["added_user_ids"], [new_user.id])
        self.assertIn(new_user.id, response.data["data"]["member_ids"])

    def test_change_team_leader_rejects_non_member(self):
        suffix = self._suffix()
        other_user = User.objects.create_user(
            kakao_id=int(f"9104{suffix}"),
            nickname=f"other-{suffix}",
        )

        response = self.client.patch(
            f"/api/v1/admin/teams/{self.team.id}/leader",
            {"leader_id": other_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "NOT_TEAM_MEMBER")

    def test_staff_can_change_team_leader_to_member(self):
        response = self.client.patch(
            f"/api/v1/admin/teams/{self.team.id}/leader",
            {"leader_id": self.member_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.owner_id, self.member_user.id)
        self.assertEqual(response.data["data"]["leader_id"], self.member_user.id)

    def test_change_team_leader_to_current_admin_adds_admin_as_leader(self):
        response = self.client.patch(
            f"/api/v1/admin/teams/{self.team.id}/leader",
            {"leader_id": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.owner_id, self.admin_user.id)
        self.assertEqual(response.data["data"]["leader_id"], self.admin_user.id)
        self.assertTrue(
            TeamMember.objects.filter(
                team=self.team,
                user=self.admin_user,
                role=TeamMemberRole.LEADER,
                status=TeamMemberStatus.ACTIVE,
            ).exists()
        )
        self.assertFalse(
            TeamMember.objects.filter(
                team=self.team,
                user=self.leader,
                role=TeamMemberRole.LEADER,
                status=TeamMemberStatus.ACTIVE,
            ).exists()
        )
