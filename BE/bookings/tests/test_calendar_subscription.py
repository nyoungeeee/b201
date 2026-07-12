from datetime import time, timedelta
from urllib.parse import urlparse

from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from accounts.calendar_tokens import CalendarTokenService
from bookings.calendar_services import CALENDAR_EVENT_LIMIT
from bookings.models import Booking, BookingStatus, BookingType
from bookings.tests.base import BaseBookingAPITestCase


@override_settings(SECRET_KEY="calendar-test-secret")
class CalendarSubscriptionAPITestCase(BaseBookingAPITestCase):
    def _booking(
        self,
        *,
        user=None,
        team=None,
        booking_type=BookingType.PRIVATE,
        reservation_date=None,
        start_time=time(18, 0),
        end_time=time(19, 0),
        status_value=BookingStatus.RESERVED,
        title=None,
    ):
        return Booking.objects.create(
            room=self.room,
            user=user or self.user,
            team=team,
            booking_type=booking_type,
            reservation_date=reservation_date or self.tomorrow,
            start_time=start_time,
            end_time=end_time,
            status=status_value,
            title=title,
        )

    def _calendar_path(self, user=None):
        token = CalendarTokenService.issue((user or self.user).id)
        return f"/calendar/{token}.ics"

    def test_authenticated_user_can_issue_calendar_url(self):
        response = self.client.post("/v1/me/calendar-subscription/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        parsed_url = urlparse(response.data["calendar_url"])
        self.assertTrue(parsed_url.path.startswith("/calendar/"))
        self.assertTrue(parsed_url.path.endswith(".ics"))
        self.assertNotIn(f"/{self.user.id}.ics", parsed_url.path)

    def test_calendar_url_issue_requires_authentication(self):
        self.client.credentials()

        response = self.client.post("/v1/me/calendar-subscription/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_feed_includes_own_private_and_all_joined_team_bookings(self):
        own_private = self._booking(title="개인, 연습")
        member_team = self._booking(
            user=self.member_user,
            team=self.team,
            booking_type=BookingType.TEAM,
            start_time=time(19, 0),
            end_time=time(20, 0),
            title="팀; 합주",
        )
        excluded_other_team = self._booking(
            user=self.other_user,
            team=self.other_team,
            booking_type=BookingType.TEAM,
            start_time=time(20, 0),
            end_time=time(21, 0),
        )

        self.client.credentials()
        with self.assertNumQueries(3):
            response = self.client.get(self._calendar_path())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode("utf-8")
        self.assertIn(
            f"UID:reservation-{own_private.reservation_number}@b201.kr", content
        )
        self.assertIn(
            f"UID:reservation-{member_team.reservation_number}@b201.kr", content
        )
        self.assertNotIn(
            f"UID:reservation-{excluded_other_team.reservation_number}@b201.kr",
            content,
        )
        self.assertIn("SUMMARY:개인\\, 연습", content)
        self.assertIn("SUMMARY:팀\\; 합주", content)
        self.assertIn("X-PUBLISHED-TTL:PT12H\r\n", content)
        self.assertIn("REFRESH-INTERVAL;VALUE=DURATION:PT12H\r\n", content)

    def test_feed_marks_canceled_and_rejected_and_confirms_pending(self):
        canceled = self._booking(status_value=BookingStatus.CANCELED)
        pending = self._booking(
            start_time=time(19, 0),
            end_time=time(20, 0),
            status_value=BookingStatus.PENDING,
        )
        rejected = self._booking(
            start_time=time(20, 0),
            end_time=time(21, 0),
            status_value=BookingStatus.REJECTED,
        )

        self.client.credentials()
        response = self.client.get(self._calendar_path())

        content = response.content.decode("utf-8")
        canceled_event = content.split(
            f"UID:reservation-{canceled.reservation_number}@b201.kr", 1
        )[1].split("END:VEVENT", 1)[0]
        pending_event = content.split(
            f"UID:reservation-{pending.reservation_number}@b201.kr", 1
        )[1].split("END:VEVENT", 1)[0]
        rejected_event = content.split(
            f"UID:reservation-{rejected.reservation_number}@b201.kr", 1
        )[1].split("END:VEVENT", 1)[0]
        self.assertIn("STATUS:CANCELLED", canceled_event)
        self.assertIn("STATUS:CONFIRMED", pending_event)
        self.assertIn("STATUS:CANCELLED", rejected_event)

    def test_upcoming_bookings_take_priority_and_feed_is_limited(self):
        bookings = []
        for index in range(CALENDAR_EVENT_LIMIT + 1):
            bookings.append(
                Booking(
                    room=self.room,
                    user=self.user,
                    booking_type=BookingType.PRIVATE,
                    reservation_date=self.tomorrow + timedelta(days=index),
                    start_time=time(18, 0),
                    end_time=time(19, 0),
                    status=BookingStatus.RESERVED,
                )
            )
        Booking.objects.bulk_create(bookings)
        past = self._booking(
            reservation_date=self.today - timedelta(days=1),
            status_value=BookingStatus.RESERVED,
        )

        self.client.credentials()
        response = self.client.get(self._calendar_path())

        content = response.content.decode("utf-8")
        self.assertEqual(content.count("BEGIN:VEVENT"), CALENDAR_EVENT_LIMIT)
        self.assertNotIn(f"reservation-{past.reservation_number}@b201.kr", content)

    def test_response_headers_conditional_request_and_invalid_token(self):
        self._booking()
        path = self._calendar_path()
        self.client.credentials()

        response = self.client.get(path)

        self.assertEqual(response["Content-Type"], "text/calendar; charset=utf-8")
        self.assertRegex(
            response["Content-Disposition"],
            r'^attachment; filename="b201-\d{8}T\d{6}Z\.ics"$',
        )
        self.assertEqual(response["Cache-Control"], "private, no-cache")
        self.assertIn("ETag", response)
        self.assertIn("Last-Modified", response)
        self.assertTrue(response.content.endswith(b"\r\n"))

        not_modified = self.client.get(path, HTTP_IF_NONE_MATCH=response["ETag"])
        self.assertEqual(not_modified.status_code, status.HTTP_304_NOT_MODIFIED)
        self.assertEqual(not_modified.content, b"")

        invalid = self.client.get("/calendar/not-a-valid-token.ics")
        self.assertEqual(invalid.status_code, status.HTTP_404_NOT_FOUND)

    def test_long_utf8_line_is_folded_within_75_octets(self):
        self._booking(title="긴한글제목" * 20)
        self.client.credentials()

        response = self.client.get(self._calendar_path())

        for line in response.content.split(b"\r\n"):
            self.assertLessEqual(len(line), 75)
