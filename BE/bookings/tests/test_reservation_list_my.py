from datetime import time, timedelta
from uuid import uuid4

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from .base import BaseBookingAPITestCase


class MyReservationListAPITestCase(BaseBookingAPITestCase):
    # 예정 예약 조회 시 status 미입력이어도 취소 상태는 제외되는지 검증한다.
    def test_get_upcoming_reservations_excludes_canceled_without_filter(self):
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.CANCELED,
        )
        reserved = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get("/v1/reservations/?type=private&period=upcoming")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["reservation_number"] for item in response.data["reservations"]],
            [reserved.reservation_number],
        )
        self.assertEqual(
            [item["status"] for item in response.data["reservations"]],
            ["APPROVED"],
        )

    # 내 예약 조회 시 status 하나를 지정하면 해당 상태 예약만 반환되는지 검증한다.
    def test_get_my_reservations_filters_single_status(self):
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.CANCELED,
        )
        reserved = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get(
            "/v1/reservations/?type=private&period=upcoming&status=APPROVED"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            reserved.reservation_number,
        )
        self.assertEqual(
            response.data["reservations"][0]["status"],
            "APPROVED",
        )

    # 내 예약 조회 시 status를 두 개 넘기면 둘 다 포함해서 반환되는지 검증한다.
    def test_get_my_reservations_filters_multiple_statuses(self):
        approved = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.RESERVED,
        )
        pending = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(11, 0),
            end_time=time(12, 0),
            status=BookingStatus.PENDING,
        )
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.CANCELED,
        )

        response = self.client.get(
            "/v1/reservations/?type=private&period=upcoming&status=APPROVED&status=PENDING"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["reservation_number"] for item in response.data["reservations"]],
            [approved.reservation_number, pending.reservation_number],
        )
        self.assertEqual(
            [item["status"] for item in response.data["reservations"]],
            ["APPROVED", BookingStatus.PENDING],
        )

    # 내 예약 조회 시 page/size가 적용되는지 검증한다.
    def test_get_my_reservations_applies_pagination(self):
        first = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        second = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )

        response = self.client.get(
            "/v1/reservations/?type=private&period=upcoming&page=1&size=1"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            first.reservation_number,
        )
        self.assertNotEqual(
            response.data["reservations"][0]["reservation_number"],
            second.reservation_number,
        )

    # 내 예약 조회 시 반복 예약과 단건 예약을 구분해서 반환하는지 검증한다.
    def test_get_my_reservations_returns_reservation_kind(self):
        repeat_group_id = uuid4()
        repeat_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(9, 0),
            end_time=time(10, 0),
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[1],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=7),
        )
        single_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.tomorrow,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )

        response = self.client.get("/v1/reservations/?type=private&period=upcoming")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kind_by_number = {
            item["reservation_number"]: item["kind"]
            for item in response.data["reservations"]
        }
        repeat_count_by_number = {
            item["reservation_number"]: item["repeat_count"]
            for item in response.data["reservations"]
        }
        self.assertEqual(kind_by_number[repeat_booking.reservation_number], "repeat")
        self.assertEqual(kind_by_number[single_booking.reservation_number], "single")
        self.assertEqual(repeat_count_by_number[repeat_booking.reservation_number], 2)
        self.assertIsNone(repeat_count_by_number[single_booking.reservation_number])
