from django.urls import path

from teams.views import (
    TeamColorsView,
    TeamConfigView,
    TeamDetailView,
    TeamLeaderView,
    TeamMemberView,
    TeamMembersView,
)

urlpatterns = [
    path("colors/", TeamColorsView.as_view(), name="team_colors"),
    path("<int:team_id>/", TeamDetailView.as_view(), name="team_detail"),
    path("<int:team_id>/members/", TeamMembersView.as_view(), name="team_members"),
    path(
        "<int:team_id>/members/<int:member_id>/",
        TeamMemberView.as_view(),
        name="team_member",
    ),
    path("<int:team_id>/leader/", TeamLeaderView.as_view(), name="team_leader"),
    path("<int:team_id>/config/", TeamConfigView.as_view(), name="team_config"),
]
