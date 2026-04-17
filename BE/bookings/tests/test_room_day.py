from datetime import time

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from studios.models import ClosureType, RoomClosure
from .base import BaseBookingAPITestCase


class RoomDayAPITestCase(BaseBookingAPITestCase):
    # 존재하지 않는 룸의 일별 조회는 404를 반환하는지 검증한다.
    def test_day_booking_view_returns_404_for_missing_room(self):
        response = self.client.get("/api/v1/rooms/999999/day/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_STUDIO_ROOM")

    # 일별 조회는 예약과 휴무 슬롯을 시간순으로 함께 반환하는지 검증한다.
    def test_day_booking_view_returns_reservations_and_closures(self):
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today,
            start_time=time(12, 0),
            end_time=time(13, 0),
            closure_type=ClosureType.BLOCKED,
            reason="점검",
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/day/?date={self.today.isoformat()}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["slot"]), 2)
        self.assertEqual(response.data["slot"][0]["name"], self.user.nickname)
        self.assertEqual(response.data["slot"][0]["status"], "PENDING")
        self.assertEqual(response.data["slot"][1]["name"], "점검")
        self.assertIsNone(response.data["slot"][1]["status"])

    # 일별 조회는 승인 대기 예약도 함께 반환하는지 검증한다.
    def test_day_booking_view_includes_pending_reservations(self):
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/day/?date={self.today.isoformat()}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["slot"]), 1)
        self.assertEqual(response.data["slot"][0]["status"], BookingStatus.PENDING)

    # 다음날 새벽 슬롯은 일별 조회에서 자정 이후 순서로 정렬되는지 검증한다.
    def test_day_booking_view_sorts_overnight_slots_after_late_night_slots(self):
        Booking.objects.create(
            room=self.overnight_room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(1, 0),
            end_time=time(2, 0),
            status=BookingStatus.PENDING,
        )
        Booking.objects.create(
            room=self.overnight_room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(23, 0),
            end_time=time(23, 30),
            status=BookingStatus.PENDING,
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.overnight_room.id}/day/?date={self.today.isoformat()}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["start_time"] for item in response.data["slot"]],
            ["23:00:00", "01:00:00"],
        )
