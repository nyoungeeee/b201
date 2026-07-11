from django.urls import path

from bookings.calendar_views import CalendarSubscriptionView

urlpatterns = [
    path(
        "<str:token>.ics",
        CalendarSubscriptionView.as_view(),
        name="calendar-subscription",
    ),
]
