from datetime import time, timedelta
from uuid import uuid4

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from .base import BaseBookingAPITestCase


class TeamReservationListAPITestCase(BaseBookingAPITestCase):
    # 팀 예약 조회 시 본인이 속한 팀 예약만 반환되는지 검증한다.
    def test_get_team_reservations_returns_only_member_team_bookings(self):
        own_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(19, 0),
            end_time=time(20, 0),
        )
        Booking.objects.create(
            room=self.room,
            user=self.other_user,
            team=self.other_team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(20, 0),
            end_time=time(21, 0),
        )

        response = self.client.get("/api/v1/reservations/team")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(
            response.data["reservations"][0]["reservation_number"],
            own_booking.reservation_number,
        )
        self.assertEqual(response.data["reservations"][0]["team_id"], self.team.id)

    # 팀 예약 조회 시 status를 두 개 넘기면 해당 상태의 팀 예약만 반환되는지 검증한다.
    def test_get_team_reservations_filters_multiple_statuses(self):
        canceled = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(19, 0),
            end_time=time(20, 0),
            status=BookingStatus.CANCELED,
        )
        pending = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(20, 0),
            end_time=time(21, 0),
            status=BookingStatus.PENDING,
        )
        Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.tomorrow,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get(
            "/api/v1/reservations/team?status=CANCELED&status=PENDING"
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

    # 소속되지 않은 팀으로 팀 예약 조회를 시도하면 금지되는지 검증한다.
    def test_get_team_reservations_rejects_non_member_team_filter(self):
        response = self.client.get(
            f"/api/v1/reservations/team?team_id={self.other_team.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")

    # 팀 예약 조회 시 반복 예약과 단건 예약을 구분해서 반환하는지 검증한다.
    def test_get_team_reservations_returns_reservation_kind(self):
        repeat_group_id = uuid4()
        repeat_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.tomorrow,
            start_time=time(19, 0),
            end_time=time(20, 0),
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[1],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=7),
        )
        single_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(20, 0),
            end_time=time(21, 0),
        )

        response = self.client.get("/api/v1/reservations/team")

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
