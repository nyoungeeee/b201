from datetime import date, time

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from studios.models import ClosureType, RoomClosure, StudioRoom, StudioRoomStatus
from .base import BaseBackofficeAPITestCase


class BackofficeDayOffAPITestCase(BaseBackofficeAPITestCase):
    def setUp(self):
        super().setUp()
        self.room = StudioRoom.objects.create(
            name=f"B201-{self._suffix()}",
            open_time=time(9, 0),
            close_time=time(23, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
        )
        self.today = date.today()

    def test_staff_can_get_day_off_list(self):
        closure = RoomClosure.objects.create(
            room=None,
            start_date=self.today,
            end_date=self.today,
            closure_date=self.today,
            start_time=None,
            end_time=None,
            is_all_day=True,
            closure_type=ClosureType.HOLIDAY,
            reason="임시 휴무",
        )

        response = self.client.get("/api/v1/admin/rooms/day-offs")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(response.data["data"][0]["id"], closure.id)
        self.assertIsNone(response.data["data"][0]["room_id"])
        self.assertEqual(response.data["data"][0]["room_name"], "전체 합주실")
        self.assertEqual(response.data["data"][0]["type"], "휴무")

    def test_day_off_conflict_check_returns_overlapping_reservations(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.post(
            "/api/v1/admin/rooms/day-offs/conflict-check",
            {
                "room_id": None,
                "type": "점검",
                "start_date": self.today.isoformat(),
                "end_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "is_all_day": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["id"], booking.reservation_number)
        self.assertEqual(response.data["data"][0]["room_id"], self.room.id)
        self.assertEqual(response.data["data"][0]["status"], "approved")

    def test_create_day_off_returns_conflict_business_error_without_force_cancel(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.post(
            "/api/v1/admin/rooms/day-offs",
            {
                "room_id": self.room.id,
                "type": "점검",
                "start_date": self.today.isoformat(),
                "end_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "is_all_day": False,
                "reason": "전기 점검",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "RESERVATION_CONFLICT")
        self.assertEqual(response.data["data"][0]["id"], booking.reservation_number)

    def test_staff_can_create_day_off_with_force_cancel(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.post(
            "/api/v1/admin/rooms/day-offs",
            {
                "room_id": self.room.id,
                "type": "점검",
                "start_date": self.today.isoformat(),
                "end_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "is_all_day": False,
                "reason": "전기 점검",
                "force_cancel_reservation_ids": [booking.reservation_number],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["data"]["room_id"], self.room.id)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELED)
        self.assertEqual(booking.canceled_by_id, self.admin_user.id)

    def test_create_holiday_forces_all_day(self):
        response = self.client.post(
            "/api/v1/admin/rooms/day-offs",
            {
                "room_id": self.room.id,
                "type": "휴무",
                "start_date": self.today.isoformat(),
                "end_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "is_all_day": False,
                "reason": "정기 휴무",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["data"]["is_all_day"])
        self.assertIsNone(response.data["data"]["start_time"])
        self.assertIsNone(response.data["data"]["end_time"])

        closure = RoomClosure.objects.get(id=response.data["data"]["id"])
        self.assertEqual(closure.closure_type, ClosureType.HOLIDAY)
        self.assertTrue(closure.is_all_day)
        self.assertIsNone(closure.start_time)
        self.assertIsNone(closure.end_time)

    def test_holiday_conflict_check_uses_all_day_even_when_request_is_partial(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(20, 0),
            end_time=time(21, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.post(
            "/api/v1/admin/rooms/day-offs/conflict-check",
            {
                "room_id": self.room.id,
                "type": "휴무",
                "start_date": self.today.isoformat(),
                "end_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "is_all_day": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["id"], booking.reservation_number)

    def test_staff_can_delete_day_off(self):
        closure = RoomClosure.objects.create(
            room=self.room,
            start_date=self.today,
            end_date=self.today,
            closure_date=self.today,
            start_time=time(9, 0),
            end_time=time(12, 0),
            is_all_day=False,
            closure_type=ClosureType.MAINTENANCE,
            reason="전기 점검",
        )

        response = self.client.delete(f"/api/v1/admin/rooms/day-offs/{closure.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        self.assertFalse(RoomClosure.objects.filter(id=closure.id).exists())
