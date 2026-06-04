from datetime import time, timedelta

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from studios.models import ClosureType, RoomClosure
from .base import BaseBookingAPITestCase


class PrivateReservationCreateAPITestCase(BaseBookingAPITestCase):
    # 개인 예약 생성 시 예약 번호와 표시값이 정상 반환되는지 검증한다.
    def test_create_private_reservation_succeeds(self):
        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
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
        self.assertEqual(response.data["reservations"][0]["type"], "private")
        self.assertEqual(
            response.data["reservations"][0]["applicant_name"], self.user.nickname
        )
        self.assertEqual(response.data["reservations"][0]["color"], "#DADADA")
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"],
            user=self.user,
        )
        self.assertEqual(booking.status, BookingStatus.PENDING)

    # 비활성 룸에는 개인 예약을 생성할 수 없는지 검증한다.
    def test_create_private_reservation_rejects_inactive_room(self):
        response = self.client.post(
            f"/v1/reservations/{self.inactive_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "INACTIVE_STUDIO_ROOM")

    # 같은 시간대 예약이 있으면 개인 예약 생성이 충돌하는지 검증한다.
    def test_create_private_reservation_rejects_overlapping_booking(self):
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(9, 0),
            end_time=time(10, 0),
        )

        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "09:30:00",
                "end_time": "10:30:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    def test_create_private_reservation_rejects_overlapping_closure_time(self):
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today,
            start_date=self.today,
            end_date=self.today,
            start_time=time(10, 0),
            end_time=time(12, 0),
            is_all_day=False,
            closure_type=ClosureType.MAINTENANCE,
            reason="점검",
        )

        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "11:00:00",
                "end_time": "12:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    def test_create_private_reservation_rejects_all_day_holiday_closure(self):
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today,
            start_date=self.today,
            end_date=self.today,
            start_time=None,
            end_time=None,
            is_all_day=True,
            closure_type=ClosureType.HOLIDAY,
            reason="휴무",
        )

        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    def test_create_private_reservation_rejects_global_holiday_closure(self):
        RoomClosure.objects.create(
            room=None,
            closure_date=self.today,
            start_date=self.today,
            end_date=self.today,
            start_time=None,
            end_time=None,
            is_all_day=True,
            closure_type=ClosureType.HOLIDAY,
            reason="전체 휴무",
        )

        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    def test_create_private_reservation_rejects_range_holiday_closure(self):
        target_date = self.today + timedelta(days=1)
        RoomClosure.objects.create(
            room=self.room,
            closure_date=self.today,
            start_date=self.today,
            end_date=target_date,
            start_time=None,
            end_time=None,
            is_all_day=True,
            closure_type=ClosureType.HOLIDAY,
            reason="연휴",
        )

        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": target_date.isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    # 개인 예약 생성 시 예약 시간은 30분 단위만 허용되는지 검증한다.
    def test_create_private_reservation_rejects_non_half_hour_time(self):
        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "09:15:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_BOOKING_TIME")

    # 개인 예약 생성 시 count만큼 1주 간격 반복 예약이 생성되는지 검증한다.
    def test_create_private_reservation_creates_weekly_recurring_bookings(self):
        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
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
        self.assertEqual(len(response.data["reservations"]), 3)
        self.assertEqual(
            [item["start_date"] for item in response.data["reservations"]],
            [
                self.today.isoformat(),
                (self.today + timedelta(days=7)).isoformat(),
                (self.today + timedelta(days=14)).isoformat(),
            ],
        )
        self.assertEqual(
            Booking.objects.filter(
                user=self.user,
                room=self.room,
                booking_type=BookingType.PRIVATE,
                status=BookingStatus.PENDING,
            ).count(),
            3,
        )
        repeat_group_ids = set(
            Booking.objects.filter(
                user=self.user,
                room=self.room,
                booking_type=BookingType.PRIVATE,
                status=BookingStatus.PENDING,
            ).values_list("repeat_group_id", flat=True)
        )
        self.assertEqual(len(repeat_group_ids), 1)
        self.assertNotIn(None, repeat_group_ids)

    # 반복 예약 확인 시 충돌 주차와 예약 가능 주차를 함께 반환하는지 검증한다.
    def test_repeat_check_private_reservation_returns_conflict_weeks(self):
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
            f"/v1/reservations/{self.room.id}/repeat-check",
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
        self.assertEqual(
            response.data["available_occurrences"],
            [
                {"week": 1, "date": self.today.isoformat()},
                {"week": 3, "date": (self.today + timedelta(days=14)).isoformat()},
            ],
        )
        self.assertEqual(response.data["conflict_occurrences"][0]["week"], 2)
        self.assertEqual(
            response.data["conflict_occurrences"][0]["date"],
            second_week_date.isoformat(),
        )

    # 반복 예약 생성 시 충돌 주차는 건너뛰고 가능한 주차만 예약하는지 검증한다.
    def test_repeat_create_private_reservation_skips_conflict_weeks(self):
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
            f"/v1/reservations/{self.room.id}",
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
        self.assertEqual(
            [item["start_date"] for item in response.data["reservations"]],
            [
                self.today.isoformat(),
                (self.today + timedelta(days=14)).isoformat(),
            ],
        )
        repeat_group_ids = set(
            Booking.objects.filter(
                user=self.user,
                room=self.room,
                booking_type=BookingType.PRIVATE,
            ).values_list("repeat_group_id", flat=True)
        )
        self.assertEqual(len(repeat_group_ids), 1)

    # 반복 예약 가능한 주차가 하나도 없으면 예약을 생성하지 않는지 검증한다.
    def test_repeat_create_private_reservation_rejects_when_no_available_dates(self):
        for index in range(3):
            Booking.objects.create(
                room=self.room,
                user=self.other_user,
                booking_type=BookingType.PRIVATE,
                reservation_date=self.today + timedelta(days=7 * index),
                start_time=time(9, 30),
                end_time=time(10, 30),
                status=BookingStatus.PENDING,
            )

        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "count": 3,
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "NO_AVAILABLE_REPEAT_DATES")
        self.assertEqual(
            Booking.objects.filter(
                user=self.user,
                room=self.room,
                booking_type=BookingType.PRIVATE,
            ).count(),
            0,
        )

    # 다음날 새벽까지 운영하는 룸은 자정을 넘는 예약을 허용하는지 검증한다.
    def test_create_private_reservation_allows_cross_midnight_booking(self):
        response = self.client.post(
            f"/v1/reservations/{self.overnight_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "23:00:00",
                "end_time": "01:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"]
        )
        self.assertEqual(booking.room_id, self.overnight_room.id)
        self.assertEqual(booking.start_time, time(23, 0))
        self.assertEqual(booking.end_time, time(1, 0))

    # 다음날 새벽 운영 시간도 같은 운영일 예약으로 허용되는지 검증한다.
    def test_create_private_reservation_allows_next_day_early_morning_booking(self):
        response = self.client.post(
            f"/v1/reservations/{self.overnight_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "01:00:00",
                "end_time": "02:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)

    # 다음날 새벽 운영 룸은 운영 시간 밖 예약을 거부하는지 검증한다.
    def test_create_private_reservation_rejects_time_outside_overnight_hours(self):
        response = self.client.post(
            f"/v1/reservations/{self.overnight_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "04:00:00",
                "end_time": "05:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "OUTSIDE_OPERATING_HOURS")

    # 다음날 새벽 운영 룸은 자정을 넘는 예약 충돌도 감지하는지 검증한다.
    def test_create_private_reservation_rejects_overlapping_cross_midnight_booking(
        self,
    ):
        Booking.objects.create(
            room=self.overnight_room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(23, 30),
            end_time=time(1, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.post(
            f"/v1/reservations/{self.overnight_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "00:30:00",
                "end_time": "01:30:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    # 24시간 운영 룸은 운영 종료 직전 시간 예약을 허용하는지 검증한다.
    def test_create_private_reservation_allows_last_hour_in_full_day_room(self):
        response = self.client.post(
            f"/v1/reservations/{self.full_day_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "08:00:00",
                "end_time": "09:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)

    # 24시간 운영 룸은 운영일 경계를 넘어가는 예약도 허용되는지 검증한다.
    def test_create_private_reservation_allows_cross_boundary_in_full_day_room(self):
        response = self.client.post(
            f"/v1/reservations/{self.full_day_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "08:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
