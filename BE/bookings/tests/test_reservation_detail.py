from datetime import time, timedelta

from django.utils import timezone
from rest_framework import status

from bookings.exceptions import DuplicatedReservationError
from bookings.models import (
    Booking,
    BookingStatus,
    BookingType,
    ReservationRepeatOccurrence,
    ReservationRepeatOccurrenceStatus,
)
from bookings.services import ReservationCommandService
from .base import BaseBookingAPITestCase


class ReservationDetailAPITestCase(BaseBookingAPITestCase):
    def test_single_reservation_detail_uses_unified_shape(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(20, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get(
            f"/api/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["reservation_number"], booking.reservation_number
        )
        self.assertIsNone(response.data["repeat_group_id"])
        self.assertEqual(response.data["kind"], "single")
        self.assertIsNone(response.data["repeat"])
        self.assertEqual(response.data["conflict_count"], 0)
        self.assertEqual(len(response.data["occurrences"]), 1)

        occurrence = response.data["occurrences"][0]
        self.assertIsNone(occurrence["week"])
        self.assertEqual(
            occurrence["reservation_number"],
            booking.reservation_number,
        )
        self.assertEqual(occurrence["status"], "PENDING")
        self.assertFalse(occurrence["can_reapply"])
        self.assertNotIn("reason_message", occurrence)
        self.assertNotIn("reason_message", response.data)

    def test_canceled_reservation_detail_returns_canceler(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(20, 0),
            status=BookingStatus.CANCELED,
            canceled_at=timezone.now(),
            canceled_by=self.member_user,
        )

        response = self.client.get(
            f"/api/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["canceled_by"], self.member_user.id)
        self.assertEqual(response.data["canceled_by_name"], self.member_user.nickname)
        occurrence = response.data["occurrences"][0]
        self.assertEqual(occurrence["canceled_by"], self.member_user.id)
        self.assertEqual(
            occurrence["canceled_by_name"],
            self.member_user.nickname,
        )

    def test_repeat_reservation_detail_includes_conflict_occurrence(self):
        conflict_date = self.tomorrow + timedelta(days=7)
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=conflict_date,
            start_time=time(18, 30),
            end_time=time(19, 30),
            status=BookingStatus.PENDING,
        )

        reservation_list = ReservationCommandService.create_private_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.tomorrow,
            count=3,
            start_time=time(18, 0),
            end_time=time(19, 0),
        )
        first_reservation = reservation_list.reservations[0]

        response = self.client.get(
            f"/api/v1/reservations/number/{first_reservation.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kind"], "repeat")
        self.assertEqual(response.data["conflict_count"], 1)
        self.assertEqual(response.data["repeat"]["count"], 3)
        self.assertEqual(len(response.data["occurrences"]), 3)

        second_occurrence = response.data["occurrences"][1]
        self.assertEqual(second_occurrence["week"], 2)
        self.assertEqual(second_occurrence["status"], "CONFLICT")
        self.assertIsNone(second_occurrence["reservation_number"])
        self.assertTrue(second_occurrence["can_reapply"])
        self.assertEqual(
            second_occurrence["reason_code"],
            DuplicatedReservationError.code,
        )
        self.assertNotIn("reason_message", second_occurrence)
        self.assertNotIn("reason_message", response.data)

    def test_repeat_create_persists_conflict_occurrence(self):
        conflict_date = self.tomorrow + timedelta(days=7)
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=conflict_date,
            start_time=time(18, 30),
            end_time=time(19, 30),
            status=BookingStatus.PENDING,
        )

        reservation_list = ReservationCommandService.create_private_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.tomorrow,
            count=3,
            start_time=time(18, 0),
            end_time=time(19, 0),
        )
        booking = Booking.objects.get(
            reservation_number=reservation_list.reservations[0].reservation_number
        )
        repeat_group_id = booking.repeat_group_id

        occurrence = ReservationRepeatOccurrence.objects.get(
            repeat_group_id=repeat_group_id,
            week=2,
        )

        self.assertEqual(
            occurrence.status,
            ReservationRepeatOccurrenceStatus.CONFLICT,
        )
        self.assertIsNone(occurrence.booking_id)
        self.assertEqual(occurrence.reason_code, DuplicatedReservationError.code)
