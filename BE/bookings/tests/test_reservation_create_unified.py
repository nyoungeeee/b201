from datetime import time, timedelta

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from .base import BaseBookingAPITestCase


class UnifiedReservationCreateAPITestCase(BaseBookingAPITestCase):
    def test_create_reservation_creates_private_booking(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        item = response.data["reservations"][0]
        self.assertEqual(item["type"], "private")
        self.assertEqual(item["applicant_id"], self.user.id)
        self.assertEqual(item["applicant_name"], self.user.nickname)
        self.assertEqual(item["color"], "#DADADA")
        booking = Booking.objects.get(reservation_number=item["reservation_number"])
        self.assertEqual(booking.booking_type, BookingType.PRIVATE)
        self.assertEqual(booking.status, BookingStatus.PENDING)

    def test_create_reservation_creates_team_booking(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}",
            {
                "type": "team",
                "team_id": self.team.id,
                "start_date": self.today.isoformat(),
                "start_time": "19:00:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        item = response.data["reservations"][0]
        self.assertEqual(item["type"], "team")
        self.assertEqual(item["team_id"], self.team.id)
        self.assertEqual(item["team_name"], self.team.name)
        self.assertEqual(item["color"], f"#{self.team.color}")
        booking = Booking.objects.get(reservation_number=item["reservation_number"])
        self.assertEqual(booking.booking_type, BookingType.TEAM)
        self.assertEqual(booking.team_id, self.team.id)

    def test_create_reservation_requires_team_id_for_team_booking(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}",
            {
                "type": "team",
                "start_date": self.today.isoformat(),
                "start_time": "19:00:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_reservation_uses_repeat_flow_when_count_is_greater_than_one(self):
        second_week_date = self.today + timedelta(days=7)
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=second_week_date,
            start_time=time(9, 30),
            end_time=time(10, 30),
            status=BookingStatus.PENDING,
        )

        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "count": 3,
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 2)
        self.assertEqual(response.data["skipped_occurrences"][0]["week"], 2)
        self.assertEqual(response.data["reservations"][0]["kind"], "repeat")

    def test_repeat_check_reservation_supports_private_booking(self):
        second_week_date = self.today + timedelta(days=7)
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=second_week_date,
            start_time=time(9, 30),
            end_time=time(10, 30),
            status=BookingStatus.PENDING,
        )

        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/repeat-check",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "count": 3,
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["available_occurrences"]), 2)
        self.assertEqual(response.data["conflict_occurrences"][0]["week"], 2)

    def test_repeat_check_reservation_supports_team_booking(self):
        second_week_date = self.today + timedelta(days=7)
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            team=self.other_team,
            booking_type=BookingType.TEAM,
            reservation_date=second_week_date,
            start_time=time(19, 30),
            end_time=time(20, 30),
            status=BookingStatus.PENDING,
        )

        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/repeat-check",
            {
                "type": "team",
                "team_id": self.team.id,
                "start_date": self.today.isoformat(),
                "count": 3,
                "start_time": "19:00:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["available_occurrences"]), 2)
        self.assertEqual(response.data["conflict_occurrences"][0]["week"], 2)
