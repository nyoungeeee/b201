from datetime import timezone as datetime_timezone
from email.utils import format_datetime

from django.http import Http404, HttpResponse, HttpResponseNotModified
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from accounts.calendar_tokens import CalendarTokenService, InvalidCalendarToken
from bookings.calendar_services import ReservationCalendarService


class CalendarSubscriptionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token: str):
        try:
            user = CalendarTokenService.resolve_user(token)
        except InvalidCalendarToken:
            raise Http404 from None

        feed = ReservationCalendarService.build_feed(user.id)
        if request.headers.get("If-None-Match") == feed.etag:
            response = HttpResponseNotModified()
        else:
            response = HttpResponse(
                feed.content,
                content_type="text/calendar; charset=utf-8",
            )
            download_time = timezone.now().astimezone(datetime_timezone.utc)
            filename = download_time.strftime("b201-%Y%m%dT%H%M%SZ.ics")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

        response["ETag"] = feed.etag
        response["Cache-Control"] = "private, no-cache"
        if feed.last_modified:
            response["Last-Modified"] = format_datetime(
                feed.last_modified.astimezone(datetime_timezone.utc),
                usegmt=True,
            )
        return response
