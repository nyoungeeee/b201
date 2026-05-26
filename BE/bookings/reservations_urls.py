from django.urls import path

from bookings.views import (
    CancelReservationView,
    RepeatReservationCheckView,
    RepeatOccurrenceCancelView,
    ReservationCreateView,
    ReservationListView,
)

urlpatterns = [
    path("", ReservationListView.as_view(), name="reservations"),
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
        "number/<int:reservation_number>",
        CancelReservationView.as_view(),
        name="reservation-cancel",
    ),
    path(
        "number/<int:reservation_number>/cancel-occurrences",
        RepeatOccurrenceCancelView.as_view(),
        name="repeat-occurrence-cancel",
    ),
]
