from django.urls import path

from bookings.views import DayBookingView, MonthBookingView

urlpatterns = [
    path("<int:room_id>/day/", DayBookingView.as_view(), name="day-booking-check"),
    path(
        "<int:room_id>/month/", MonthBookingView.as_view(), name="month-booking-check"
    ),
]
