from django.urls import path

from bookings.views import (
    CancelReservationView,
    MyReservationView,
    RepeatReservationCheckView,
    ReservationCreateView,
    ReservationListView,
    TeamReservationView,
    TeamReservationCreateView,
    PrivateReservationCreateView,
    PrivateRepeatReservationCheckView,
    PrivateRepeatReservationCreateView,
    TeamRepeatReservationCheckView,
    TeamRepeatReservationCreateView,
)

urlpatterns = [
    path("", ReservationListView.as_view(), name="reservations"),
    path("me", MyReservationView.as_view(), name="my-reservations"),
    path("team", TeamReservationView.as_view(), name="team-reservations"),
    path(
        "<int:room_id>/repeat-check",
        RepeatReservationCheckView.as_view(),
        name="repeat-reservation-check",
    ),
    path(
        "<int:room_id>",
        ReservationCreateView.as_view(),
        name="reservation-create",
    ),
    path(
        "<int:room_id>/private/repeat-check",
        PrivateRepeatReservationCheckView.as_view(),
        name="private-repeat-reservation-check",
    ),
    path(
        "<int:room_id>/private/repeat",
        PrivateRepeatReservationCreateView.as_view(),
        name="private-repeat-reservation-create",
    ),
    path(
        "<int:room_id>/private",
        PrivateReservationCreateView.as_view(),
        name="private-reservation-create",
    ),
    path(
        "<int:room_id>/team/repeat-check",
        TeamRepeatReservationCheckView.as_view(),
        name="team-repeat-reservation-check",
    ),
    path(
        "<int:room_id>/team/repeat",
        TeamRepeatReservationCreateView.as_view(),
        name="team-repeat-reservation-create",
    ),
    path(
        "<int:room_id>/team",
        TeamReservationCreateView.as_view(),
        name="team-reservation-create",
    ),
    path(
        "number/<int:reservation_number>",
        CancelReservationView.as_view(),
        name="reservation-cancel",
    ),
]
