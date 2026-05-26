from datetime import time

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
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
            f"/api/v1/reservations/number/{booking.reservation_number}"
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
        self.client.delete(f"/api/v1/reservations/number/{booking.reservation_number}")

        response = self.client.get("/api/v1/reservations/?period=upcoming")

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
            f"/api/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")

    # 존재하지 않는 예약 번호 취소 시 404를 반환하는지 검증한다.
    def test_cancel_reservation_returns_404_for_missing_booking(self):
        response = self.client.delete("/api/v1/reservations/number/999999")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_BOOKING")
