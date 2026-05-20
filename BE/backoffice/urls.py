from django.urls import path

from backoffice.views import (
    AdminDayOffConflictView,
    AdminDayOffDetailView,
    AdminDayOffListView,
    AdminLogListView,
    AdminReservationApproveView,
    AdminReservationCancelView,
    AdminReservationCancelOccurrencesView,
    AdminReservationConflictView,
    AdminReservationDetailView,
    AdminReservationListView,
    AdminRoomDetailView,
    AdminRoomListView,
    AdminTeamColorListView,
    AdminTeamDetailView,
    AdminTeamLeaderView,
    AdminTeamListView,
    AdminTeamMemberListView,
    AdminUserBlockView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserUnblockView,
)

urlpatterns = [
    path("users", AdminUserListView.as_view(), name="admin-users"),
    path("users/<int:user_id>", AdminUserDetailView.as_view(), name="admin-user"),
    path(
        "users/<int:user_id>/block",
        AdminUserBlockView.as_view(),
        name="admin-user-block",
    ),
    path(
        "users/<int:user_id>/unblock",
        AdminUserUnblockView.as_view(),
        name="admin-user-unblock",
    ),
    path("teams/colors", AdminTeamColorListView.as_view(), name="admin-team-colors"),
    path("teams", AdminTeamListView.as_view(), name="admin-teams"),
    path("teams/<int:team_id>", AdminTeamDetailView.as_view(), name="admin-team"),
    path(
        "teams/<int:team_id>/members",
        AdminTeamMemberListView.as_view(),
        name="admin-team-members",
    ),
    path(
        "teams/<int:team_id>/leader",
        AdminTeamLeaderView.as_view(),
        name="admin-team-leader",
    ),
    path("rooms", AdminRoomListView.as_view(), name="admin-rooms"),
    path("rooms/<int:room_id>", AdminRoomDetailView.as_view(), name="admin-room"),
    path(
        "rooms/day-offs/conflict-check",
        AdminDayOffConflictView.as_view(),
        name="admin-day-off-conflict-check",
    ),
    path("rooms/day-offs", AdminDayOffListView.as_view(), name="admin-day-offs"),
    path(
        "rooms/day-offs/<int:day_off_id>",
        AdminDayOffDetailView.as_view(),
        name="admin-day-off",
    ),
    path("logs", AdminLogListView.as_view(), name="admin-logs"),
    path(
        "reservations/conflicts",
        AdminReservationConflictView.as_view(),
        name="admin-reservation-conflicts",
    ),
    path(
        "reservations",
        AdminReservationListView.as_view(),
        name="admin-reservations",
    ),
    path(
        "reservations/<int:reservation_id>",
        AdminReservationDetailView.as_view(),
        name="admin-reservation",
    ),
    path(
        "reservations/<int:reservation_id>/approve",
        AdminReservationApproveView.as_view(),
        name="admin-reservation-approve",
    ),
    path(
        "reservations/<int:reservation_id>/cancel",
        AdminReservationCancelView.as_view(),
        name="admin-reservation-cancel",
    ),
    path(
        "reservations/<int:reservation_id>/cancel-occurrences",
        AdminReservationCancelOccurrencesView.as_view(),
        name="admin-reservation-cancel-occurrences",
    ),
]
