from datetime import time, timedelta

from rest_framework import status

from bookings.models import (
    Booking,
    BookingStatus,
    BookingType,
    ReservationRepeatOccurrence,
    ReservationRepeatOccurrenceStatus,
)
from bookings.services import ReservationCommandService
from .base import BaseBookingAPITestCase


class ReservationCancelAPITestCase(BaseBookingAPITestCase):
    # 팀 예약은 같은 팀의 다른 활성 멤버도 취소할 수 있는지 검증한다.
    def test_cancel_team_reservation_allows_active_team_member(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(19, 0),
            end_time=time(20, 0),
        )
        self._authenticate(self.member_user)

        response = self.client.delete(
            f"/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELED)
        self.assertIsNotNone(booking.canceled_at)
        self.assertEqual(booking.canceled_by_id, self.member_user.id)

    # 취소자가 예약 목록 조회 응답에 포함되는지 검증한다.
    def test_cancel_reservation_returns_canceler_in_list(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(19, 0),
            end_time=time(20, 0),
        )
        self._authenticate(self.user)
        self.client.delete(f"/v1/reservations/number/{booking.reservation_number}")

        response = self.client.get("/v1/reservations/?period=past")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["reservations"][0]
        self.assertEqual(item["reservation_number"], booking.reservation_number)
        self.assertIsNotNone(item["canceled_at"])
        self.assertEqual(item["canceled_by"], self.user.id)
        self.assertEqual(item["canceled_by_name"], self.user.nickname)

    # 예약 취소 시 권한 없는 사용자는 거부되는지 검증한다.
    def test_cancel_reservation_rejects_unauthorized_user(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        self._authenticate(self.other_user)

        response = self.client.delete(
            f"/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")

    # 존재하지 않는 예약 번호 취소 시 404를 반환하는지 검증한다.
    def test_cancel_reservation_returns_404_for_missing_booking(self):
        response = self.client.delete("/v1/reservations/number/999999")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_BOOKING")

    def test_cancel_repeat_occurrence_updates_occurrence_and_booking(self):
        reservation_list = ReservationCommandService.create_private_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.tomorrow,
            count=3,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        first_reservation = reservation_list.reservations[0]
        target_date = self.tomorrow + timedelta(days=14)

        response = self.client.patch(
            f"/v1/reservations/number/{first_reservation.reservation_number}/cancel-occurrences",
            {"dates": [target_date.isoformat()]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["canceled_occurrences"]), 1)
        canceled_occurrence = response.data["canceled_occurrences"][0]
        self.assertEqual(canceled_occurrence["week"], 3)
        self.assertEqual(canceled_occurrence["date"], target_date.isoformat())
        self.assertEqual(canceled_occurrence["status"], "CANCELED")
        self.assertEqual(canceled_occurrence["canceled_by"], self.user.nickname)
        self.assertIsNotNone(canceled_occurrence["canceled_at"])

        occurrence = ReservationRepeatOccurrence.objects.get(
            repeat_group_id=Booking.objects.get(
                reservation_number=first_reservation.reservation_number
            ).repeat_group_id,
            date=target_date,
        )
        self.assertEqual(occurrence.status, ReservationRepeatOccurrenceStatus.CANCELED)
        self.assertEqual(occurrence.canceled_by_id, self.user.id)
        self.assertIsNotNone(occurrence.canceled_at)

        occurrence.booking.refresh_from_db()
        self.assertEqual(occurrence.booking.status, BookingStatus.CANCELED)
        self.assertIsNotNone(occurrence.booking.canceled_at)

        detail_response = self.client.get(
            f"/v1/reservations/number/{first_reservation.reservation_number}"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["occurrences"][2]["status"], "CANCELED")

    def test_cancel_repeat_occurrence_allows_active_team_member(self):
        reservation_list = ReservationCommandService.create_team_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            team_id=self.team.id,
            start_date=self.tomorrow,
            count=2,
            start_time=time(12, 0),
            end_time=time(13, 0),
        )
        first_reservation = reservation_list.reservations[0]
        self._authenticate(self.member_user)

        response = self.client.patch(
            f"/v1/reservations/number/{first_reservation.reservation_number}/cancel-occurrences",
            {"dates": [self.tomorrow.isoformat()]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["canceled_occurrences"][0]["canceled_by"],
            self.member_user.nickname,
        )

    def test_cancel_repeat_occurrence_rejects_single_reservation(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

        response = self.client.patch(
            f"/v1/reservations/number/{booking.reservation_number}/cancel-occurrences",
            {"dates": [self.tomorrow.isoformat()]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "NOT_REPEAT_RESERVATION")

    def test_cancel_repeat_occurrence_rejects_missing_occurrence_date(self):
        reservation_list = ReservationCommandService.create_private_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.tomorrow,
            count=2,
            start_time=time(14, 0),
            end_time=time(15, 0),
        )
        first_reservation = reservation_list.reservations[0]
        missing_date = self.tomorrow + timedelta(days=21)

        response = self.client.patch(
            f"/v1/reservations/number/{first_reservation.reservation_number}/cancel-occurrences",
            {"dates": [missing_date.isoformat()]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_REPEAT_OCCURRENCE")
