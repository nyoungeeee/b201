from datetime import time

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from .base import BaseBookingAPITestCase


class MyReservationListAPITestCase(BaseBookingAPITestCase):
    # 내 예약 조회 시 status 미입력이어도 모든 상태가 최신순으로 반환되는지 검증한다.
    def test_get_my_reservations_returns_all_statuses_without_filter(self):
        canceled = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
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

        response = self.client.get("/api/v1/reservations/me")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["reservation_number"] for item in response.data["reservations"]],
            [reserved.reservation_number, canceled.reservation_number],
        )
        self.assertEqual(
            [item["status"] for item in response.data["reservations"]],
            [BookingStatus.RESERVED, BookingStatus.CANCELED],
        )

    # 내 예약 조회 시 status 하나를 지정하면 해당 상태 예약만 반환되는지 검증한다.
    def test_get_my_reservations_filters_single_status(self):
        Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
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

        response = self.client.get("/api/v1/reservations/me?status=RESERVED")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            reserved.reservation_number,
        )
        self.assertEqual(
            response.data["reservations"][0]["status"],
            BookingStatus.RESERVED,
        )

    # 내 예약 조회 시 status를 두 개 넘기면 둘 다 포함해서 반환되는지 검증한다.
    def test_get_my_reservations_filters_multiple_statuses(self):
        canceled = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.CANCELED,
        )
        pending = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
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
            status=BookingStatus.RESERVED,
        )

        response = self.client.get(
            "/api/v1/reservations/me?status=CANCELED&status=PENDING"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["reservation_number"] for item in response.data["reservations"]],
            [pending.reservation_number, canceled.reservation_number],
        )
        self.assertEqual(
            [item["status"] for item in response.data["reservations"]],
            [BookingStatus.PENDING, BookingStatus.CANCELED],
        )

    # 내 예약 조회 시 page/size가 적용되는지 검증한다.
    def test_get_my_reservations_applies_pagination(self):
        first = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        second = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )

        response = self.client.get("/api/v1/reservations/me?page=1&size=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            second.reservation_number,
        )
        self.assertNotEqual(
            response.data["reservations"][0]["reservation_number"],
            first.reservation_number,
        )
