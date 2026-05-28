from datetime import time

from rest_framework import status

from bookings.models import Booking, BookingType
from studios.models import ClosureType, RoomClosure
from .base import BaseBookingAPITestCase


class RoomMonthAPITestCase(BaseBookingAPITestCase):
    # 존재하지 않는 룸의 월별 조회는 404를 반환하는지 검증한다.
    def test_month_booking_view_returns_404_for_missing_room(self):
        response = self.client.get("/api/v1/rooms/999999/month/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_STUDIO_ROOM")

    # 월별 조회는 예약이 있는 날짜에만 색상이 채워지는지 검증한다.
    def test_month_booking_view_returns_colors_for_booked_days(self):
        Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today.replace(day=1),
            start_time=time(19, 0),
            end_time=time(20, 0),
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/month/?year={self.today.year}&month={self.today.month}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booked_day = next(
            item for item in response.data["days"] if item["date"].endswith("-01")
        )
        self.assertEqual(booked_day["color"], [self.team.color])
        self.assertFalse(booked_day["disabled"])
        self.assertFalse(booked_day["is_holiday"])

    # 월별 조회는 운영시간 전체가 막힌 날짜를 예약 불가로 반환하는지 검증한다.
    def test_month_booking_view_marks_fully_closed_days_as_disabled(self):
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today.replace(day=2),
            start_time=self.room.open_time,
            end_time=self.room.close_time,
            closure_type=ClosureType.HOLIDAY,
            reason="휴무",
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/month/?year={self.today.year}&month={self.today.month}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        blocked_day = next(
            item for item in response.data["days"] if item["date"].endswith("-02")
        )
        self.assertTrue(blocked_day["disabled"])
        self.assertTrue(blocked_day["is_holiday"])

    # 월별 조회는 점검일을 예약 불가로 표시하되 휴무일로는 표시하지 않는지 검증한다.
    def test_month_booking_view_marks_maintenance_as_disabled_not_holiday(self):
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today.replace(day=3),
            start_time=self.room.open_time,
            end_time=self.room.close_time,
            closure_type=ClosureType.MAINTENANCE,
            reason="점검",
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/month/?year={self.today.year}&month={self.today.month}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        maintenance_day = next(
            item for item in response.data["days"] if item["date"].endswith("-03")
        )
        self.assertTrue(maintenance_day["disabled"])
        self.assertFalse(maintenance_day["is_holiday"])

    # 월별 조회는 is_all_day 휴무일을 시간 정보 없이도 휴무로 반영하는지 검증한다.
    def test_month_booking_view_marks_all_day_holiday_without_times(self):
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today.replace(day=4),
            is_all_day=True,
            closure_type=ClosureType.HOLIDAY,
            reason="휴무",
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/month/?year={self.today.year}&month={self.today.month}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        holiday_day = next(
            item for item in response.data["days"] if item["date"].endswith("-04")
        )
        self.assertTrue(holiday_day["disabled"])
        self.assertTrue(holiday_day["is_holiday"])

    # 비활성 룸의 월별 조회는 모든 날짜를 예약 불가로 반환하는지 검증한다.
    def test_month_booking_view_marks_all_days_disabled_for_inactive_room(self):
        response = self.client.get(
            f"/api/v1/rooms/{self.inactive_room.id}/month/?year={self.today.year}&month={self.today.month}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(item["disabled"] for item in response.data["days"]))
