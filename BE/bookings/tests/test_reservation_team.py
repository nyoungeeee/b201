from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from .base import BaseBookingAPITestCase


class TeamReservationCreateAPITestCase(BaseBookingAPITestCase):
    # 팀 예약 생성 시 소속 팀 정보와 색상이 정상 반환되는지 검증한다.
    def test_create_team_reservation_succeeds(self):
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
        self.assertEqual(response.data["reservations"][0]["type"], "team")
        self.assertEqual(response.data["reservations"][0]["team_id"], self.team.id)
        self.assertEqual(response.data["reservations"][0]["team_name"], self.team.name)
        self.assertEqual(
            response.data["reservations"][0]["color"], f"#{self.team.color}"
        )
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"],
            user=self.user,
        )
        self.assertEqual(booking.status, BookingStatus.PENDING)

    # 소속되지 않은 팀으로 팀 예약 생성 시 금지되는지 검증한다.
    def test_create_team_reservation_rejects_non_member_team(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}",
            {
                "type": "team",
                "team_id": self.other_team.id,
                "start_date": self.today.isoformat(),
                "start_time": "19:00:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")

    # 팀 예약 생성 시 예약 시간은 30분 단위만 허용되는지 검증한다.
    def test_create_team_reservation_rejects_non_half_hour_time(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}",
            {
                "type": "team",
                "team_id": self.team.id,
                "start_date": self.today.isoformat(),
                "start_time": "19:10:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_BOOKING_TIME")
