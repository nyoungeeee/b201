from django.urls import path

from bookings.views import (
    CancelReservationView,
    MyReservationView,
    TeamReservationView,
    TeamReservationCreateView,
    PrivateReservationCreateView,
)

urlpatterns = [
    path("me", MyReservationView.as_view(), name="my-reservations"),
    path("team", TeamReservationView.as_view(), name="team-reservations"),
    path(
        "<int:room_id>/private",
        PrivateReservationCreateView.as_view(),
        name="private-reservation-create",
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
