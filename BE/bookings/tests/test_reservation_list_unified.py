from datetime import time, timedelta
from uuid import uuid4

from django.utils import timezone
from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from bookings.services import ReservationCommandService
from .base import BaseBookingAPITestCase


class UnifiedReservationListAPITestCase(BaseBookingAPITestCase):
    def test_legacy_split_reservation_list_urls_are_removed(self):
        for path in ["/v1/reservations/me", "/v1/reservations/team"]:
            with self.subTest(path=path):
                response = self.client.get(path)

                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_reservations_returns_private_and_member_team_bookings(self):
        private_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.PENDING,
        )
        team_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.tomorrow,
            start_time=time(20, 0),
            end_time=time(21, 0),
            status=BookingStatus.RESERVED,
        )
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            team=self.other_team,
            booking_type=BookingType.TEAM,
            reservation_date=self.tomorrow,
            start_time=time(21, 0),
            end_time=time(22, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get("/v1/reservations/?period=upcoming")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["period"], "upcoming")
        self.assertEqual(response.data["pagination"]["page"], 1)
        self.assertEqual(response.data["pagination"]["size"], 20)
        self.assertEqual(response.data["pagination"]["total_count"], 2)
        self.assertFalse(response.data["pagination"]["has_next"])
        numbers = [item["reservation_number"] for item in response.data["reservations"]]
        self.assertEqual(
            numbers,
            [private_booking.reservation_number, team_booking.reservation_number],
        )

    def test_get_reservations_defaults_to_nearest_upcoming_reservation_order(self):
        later_repeat_group_id = uuid4()
        later_repeat = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow + timedelta(days=7),
            start_time=time(18, 0),
            end_time=time(19, 0),
            repeat_group_id=later_repeat_group_id,
            repeat_weekdays=[1],
            repeat_start_date=self.tomorrow,
            repeat_end_date=self.tomorrow + timedelta(days=14),
            status=BookingStatus.PENDING,
        )
        nearest_repeat = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(20, 0),
            end_time=time(21, 0),
            repeat_group_id=later_repeat_group_id,
            repeat_weekdays=[1],
            repeat_start_date=self.tomorrow + timedelta(days=7),
            repeat_end_date=self.tomorrow + timedelta(days=14),
            status=BookingStatus.PENDING,
        )
        nearest_single = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get("/v1/reservations/?period=upcoming")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 2)
        self.assertEqual(
            [item["reservation_number"] for item in response.data["reservations"]],
            [
                nearest_single.reservation_number,
                nearest_repeat.reservation_number,
            ],
        )

    def test_get_reservations_sorts_by_latest_created_reservation(self):
        older_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.PENDING,
        )
        newer_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow + timedelta(days=1),
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.PENDING,
        )
        Booking.objects.filter(
            reservation_number=older_booking.reservation_number
        ).update(created_at=timezone.now() - timedelta(days=1))
        Booking.objects.filter(
            reservation_number=newer_booking.reservation_number
        ).update(created_at=timezone.now())

        response = self.client.get("/v1/reservations/?period=upcoming&sort=latest")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["reservation_number"] for item in response.data["reservations"]],
            [newer_booking.reservation_number, older_booking.reservation_number],
        )

    def test_get_reservations_returns_requested_item_shape(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(20, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get("/v1/reservations/?period=upcoming")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["reservations"][0]
        self.assertEqual(item["reservation_number"], booking.reservation_number)
        self.assertEqual(item["room_id"], self.room.id)
        self.assertEqual(item["room_name"], self.room.name)
        self.assertEqual(item["start_date"], self.tomorrow.isoformat())
        self.assertEqual(item["start_time"], "18:00:00")
        self.assertEqual(item["end_date"], self.tomorrow.isoformat())
        self.assertEqual(item["end_time"], "20:00:00")
        self.assertEqual(item["kind"], "single")
        self.assertIsNone(item["repeat_count"])
        self.assertEqual(item["conflict_count"], 0)
        self.assertEqual(item["type"], "private")
        self.assertIsNone(item["team_id"])
        self.assertIsNone(item["team_name"])
        self.assertEqual(item["color"], "#DADADA")
        self.assertEqual(item["applicant_id"], self.user.id)
        self.assertEqual(item["applicant_name"], self.user.nickname)
        self.assertEqual(item["status"], "APPROVED")
        self.assertIn("created_at", item)

    def test_get_reservations_filters_period_type_kind_status_team_and_paginates(self):
        repeat_group_id = uuid4()
        approved_team_repeat = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[1],
            repeat_start_date=self.tomorrow,
            repeat_end_date=self.tomorrow + timedelta(days=14),
            status=BookingStatus.RESERVED,
        )
        later_approved_team_repeat = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.tomorrow + timedelta(days=1),
            start_time=time(18, 0),
            end_time=time(19, 0),
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[1],
            repeat_start_date=self.tomorrow,
            repeat_end_date=self.tomorrow + timedelta(days=14),
            status=BookingStatus.RESERVED,
        )
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(19, 0),
            end_time=time(20, 0),
            status=BookingStatus.RESERVED,
        )
        Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today - timedelta(days=1),
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get(
            "/v1/reservations/",
            {
                "period": "upcoming",
                "type": "team",
                "kind": "repeat",
                "status": "APPROVED",
                "team_id": self.team.id,
                "page": 1,
                "size": 1,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertFalse(response.data["pagination"]["has_next"])
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            approved_team_repeat.reservation_number,
        )
        self.assertEqual(response.data["reservations"][0]["status"], "APPROVED")
        self.assertEqual(response.data["reservations"][0]["type"], "team")
        self.assertEqual(response.data["reservations"][0]["kind"], "repeat")
        self.assertEqual(response.data["reservations"][0]["repeat_count"], 3)

    def test_get_reservations_collapses_repeat_group_and_returns_conflict_count(self):
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow + timedelta(days=7),
            start_time=time(18, 30),
            end_time=time(19, 30),
            status=BookingStatus.PENDING,
        )
        ReservationCommandService.create_private_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.tomorrow,
            count=3,
            start_time=time(18, 0),
            end_time=time(19, 0),
        )

        response = self.client.get(
            "/v1/reservations/?period=upcoming&type=private&kind=repeat"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(response.data["reservations"][0]["repeat_count"], 3)
        self.assertEqual(response.data["reservations"][0]["conflict_count"], 1)

    def test_get_reservations_uses_active_occurrence_as_repeat_group_representative(
        self,
    ):
        repeat_group_id = uuid4()
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            repeat_group_id=repeat_group_id,
            repeat_start_date=self.tomorrow,
            repeat_end_date=self.tomorrow + timedelta(days=7),
            status=BookingStatus.CANCELED,
        )
        active_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow + timedelta(days=7),
            start_time=time(18, 0),
            end_time=time(19, 0),
            repeat_group_id=repeat_group_id,
            repeat_start_date=self.tomorrow,
            repeat_end_date=self.tomorrow + timedelta(days=7),
            status=BookingStatus.PENDING,
        )

        response = self.client.get("/v1/reservations/?period=upcoming")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            active_booking.reservation_number,
        )
        self.assertEqual(response.data["reservations"][0]["status"], "PENDING")

    def test_get_reservations_filters_past_and_rejected(self):
        rejected_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today - timedelta(days=1),
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.REJECTED,
        )
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.REJECTED,
        )

        response = self.client.get("/v1/reservations/?period=past&status=REJECTED")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["period"], "past")
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            rejected_booking.reservation_number,
        )
        self.assertEqual(response.data["reservations"][0]["status"], "REJECTED")

    def test_get_reservations_rejects_non_member_team_filter(self):
        response = self.client.get(
            "/v1/reservations/",
            {"period": "upcoming", "team_id": self.other_team.id},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")
