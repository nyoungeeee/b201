from datetime import time

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from studios.models import StudioRoom, StudioRoomStatus
from .base import BaseBackofficeAPITestCase


class BackofficeRoomAPITestCase(BaseBackofficeAPITestCase):
    def setUp(self):
        super().setUp()
        suffix = self._suffix()
        self.room_name = f"B201-{suffix}"
        self.inactive_room_name = f"B202-{suffix}"
        self.room = StudioRoom.objects.create(
            name=self.room_name,
            description="기본 합주실",
            open_time=time(9, 0),
            close_time=time(23, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
            sort_order=1,
        )
        self.inactive_room = StudioRoom.objects.create(
            name=self.inactive_room_name,
            description="비활성 합주실",
            open_time=time(10, 0),
            close_time=time(22, 0),
            is_24_hours=False,
            status=StudioRoomStatus.INACTIVE,
            sort_order=2,
        )

    def test_staff_can_get_active_room_list(self):
        response = self.client.get("/v1/admin/rooms")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["id"], self.room.id)
        self.assertEqual(response.data["data"][0]["name"], self.room_name)
        self.assertFalse(response.data["data"][0]["is_open_all_day"])
        self.assertTrue(response.data["data"][0]["is_active"])

    def test_room_list_can_include_inactive_rooms(self):
        response = self.client.get("/v1/admin/rooms?include_inactive=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 2)

    def test_staff_can_get_room_detail(self):
        response = self.client.get(f"/v1/admin/rooms/{self.room.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["id"], self.room.id)
        self.assertEqual(response.data["data"]["description"], "기본 합주실")
        self.assertEqual(response.data["data"]["open_time"], "09:00:00")
        self.assertEqual(response.data["data"]["close_time"], "23:00:00")

    def test_staff_can_create_room_with_next_sort_order(self):
        room_name = f"B203-{self._suffix()}"
        response = self.client.post(
            "/v1/admin/rooms",
            {
                "name": room_name,
                "description": "신규 합주실",
                "open_time": "10:00:00",
                "close_time": "22:00:00",
                "is_open_all_day": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["ok"])
        room = StudioRoom.objects.get(name=room_name)
        self.assertEqual(room.sort_order, 3)
        self.assertEqual(response.data["data"]["sort_order"], 3)

    def test_create_room_returns_business_error_for_duplicate_name(self):
        response = self.client.post(
            "/v1/admin/rooms",
            {
                "name": self.room_name,
                "description": "중복",
                "open_time": "10:00:00",
                "close_time": "22:00:00",
                "is_open_all_day": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "DUPLICATE_ROOM_NAME")

    def test_staff_can_update_room(self):
        updated_name = f"B201-new-{self._suffix()}"
        response = self.client.put(
            f"/v1/admin/rooms/{self.room.id}",
            {
                "name": updated_name,
                "description": "수정된 설명",
                "open_time": "08:00:00",
                "close_time": "23:30:00",
                "is_open_all_day": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.room.refresh_from_db()
        self.assertEqual(self.room.name, updated_name)
        self.assertTrue(self.room.is_24_hours)
        self.assertEqual(response.data["data"]["description"], "수정된 설명")

    def test_update_all_day_room_uses_open_time_as_next_day_close_time(self):
        updated_name = f"B201-all-day-{self._suffix()}"
        response = self.client.put(
            f"/v1/admin/rooms/{self.room.id}",
            {
                "name": updated_name,
                "description": "24시간 운영",
                "open_time": "09:00:00",
                "close_time": "23:30:00",
                "is_open_all_day": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.room.refresh_from_db()
        self.assertEqual(self.room.open_time, time(9, 0))
        self.assertEqual(self.room.close_time, time(9, 0))
        self.assertTrue(self.room.is_24_hours)
        self.assertEqual(response.data["data"]["close_time"], "09:00:00")

    def test_staff_can_soft_delete_room_and_cancel_active_bookings(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.room.updated_at.date(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.delete(f"/v1/admin/rooms/{self.room.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        self.room.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(self.room.status, StudioRoomStatus.INACTIVE)
        self.assertEqual(booking.status, BookingStatus.CANCELED)
        self.assertIsNotNone(booking.canceled_at)
        self.assertEqual(booking.canceled_by_id, self.admin_user.id)
