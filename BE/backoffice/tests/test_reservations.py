from datetime import date, timedelta, time
from uuid import uuid4

from rest_framework import status

from bookings.models import Booking, BookingStatus, BookingType
from studios.models import StudioRoom, StudioRoomStatus
from teams.models import Team
from .base import BaseBackofficeAPITestCase


class BackofficeReservationAPITestCase(BaseBackofficeAPITestCase):
    def setUp(self):
        super().setUp()
        suffix = self._suffix()
        self.room = StudioRoom.objects.create(
            name=f"B201-{suffix}",
            open_time=time(9, 0),
            close_time=time(23, 0),
            is_24_hours=False,
            status=StudioRoomStatus.ACTIVE,
        )
        self.team = Team.objects.create(
            name=f"테스트팀-{suffix}", owner=self.admin_user
        )
        self.today = date.today()

    def test_staff_can_create_owner_private_reservation_with_title_and_memo(self):
        response = self.client.post(
            "/api/v1/admin/reservations",
            {
                "date": self.today.isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "end_next_day": False,
                "room_id": self.room.id,
                "team_id": None,
                "title": "사장님 개인 사용",
                "memo": "앰프 점검",
                "force_cancel_conflict_ids": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["name"], "사장님 개인 사용")
        self.assertEqual(response.data["data"]["memo"], "앰프 점검")
        booking = Booking.objects.get(reservation_number=response.data["data"]["id"])
        self.assertEqual(booking.user_id, self.admin_user.id)
        self.assertEqual(booking.title, "사장님 개인 사용")
        self.assertEqual(booking.memo, "앰프 점검")

    def test_create_owner_reservation_rejects_past_date(self):
        response = self.client.post(
            "/api/v1/admin/reservations",
            {
                "date": (self.today - timedelta(days=1)).isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "end_next_day": False,
                "room_id": self.room.id,
                "team_id": None,
                "title": "사장님 개인 사용",
                "memo": "앰프 점검",
                "force_cancel_conflict_ids": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")
        self.assertIn("date", response.data["errors"])
        self.assertFalse(Booking.objects.exists())

    def test_admin_created_title_and_memo_are_visible_in_existing_room_day_api(self):
        Booking.objects.create(
            room=self.room,
            user=self.admin_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
            title="사장님 개인 사용",
            memo="앰프 점검",
        )

        response = self.client.get(
            f"/api/v1/rooms/{self.room.id}/day/?date={self.today.isoformat()}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slot"][0]["name"], "사장님 개인 사용")
        self.assertEqual(response.data["slot"][0]["memo"], "앰프 점검")

    # def test_admin_created_memo_is_visible_in_existing_my_reservation_api(self):
    #     booking = Booking.objects.create(
    #         room=self.room,
    #         user=self.admin_user,
    #         booking_type=BookingType.PRIVATE,
    #         reservation_date=self.today,
    #         start_time=time(10, 0),
    #         end_time=time(11, 0),
    #         status=BookingStatus.PENDING,
    #         title="사장님 개인 사용",
    #         memo="앰프 점검",
    #     )

    #     response = self.client.get("/api/v1/reservations/me")

    #     self.assertEqual(response.status_code, status.HTTP_200_OK)
    #     self.assertEqual(
    #         response.data["reservations"][0]["reservation_number"],
    #         booking.reservation_number,
    #     )
    #     self.assertEqual(response.data["reservations"][0]["name"], "사장님 개인 사용")
    #     self.assertEqual(response.data["reservations"][0]["memo"], "앰프 점검")

    def test_staff_can_approve_pending_reservation(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.patch(
            f"/api/v1/admin/reservations/{booking.reservation_number}/approve"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.RESERVED)

    def test_staff_can_approve_repeat_reservation_group(self):
        repeat_group_id = uuid4()
        first_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[2],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=14),
        )
        Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[2],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=14),
        )
        Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=14),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[2],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=14),
        )

        approve_response = self.client.patch(
            f"/api/v1/admin/reservations/{first_booking.reservation_number}/approve"
        )
        pending_response = self.client.get("/api/v1/admin/reservations?status=pending")
        approved_response = self.client.get(
            "/api/v1/admin/reservations?status=approved&date_range=30"
        )

        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Booking.objects.filter(
                repeat_group_id=repeat_group_id,
                status=BookingStatus.RESERVED,
            ).count(),
            3,
        )
        self.assertEqual(pending_response.data["pagination"]["total_count"], 0)
        self.assertEqual(approved_response.data["pagination"]["total_count"], 1)
        self.assertEqual(approved_response.data["data"][0]["kind"], "repeat")

    def test_staff_can_get_reservation_list_and_detail(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
            memo="문의 메모",
        )

        list_response = self.client.get("/api/v1/admin/reservations?status=pending")
        detail_response = self.client.get(
            f"/api/v1/admin/reservations/{booking.reservation_number}"
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["pagination"]["total_count"], 1)
        self.assertEqual(
            list_response.data["data"][0]["id"], booking.reservation_number
        )
        self.assertEqual(list_response.data["data"][0]["memo"], "문의 메모")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["data"]["id"], booking.reservation_number)

    def test_repeat_reservation_list_collapses_same_repeat_group(self):
        repeat_group_id = uuid4()
        first_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[2],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=14),
        )
        Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[2],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=14),
        )
        latest_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=14),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
            repeat_group_id=repeat_group_id,
            repeat_weekdays=[2],
            repeat_start_date=self.today,
            repeat_end_date=self.today + timedelta(days=14),
        )

        response = self.client.get(
            "/api/v1/admin/reservations?status=approved&date_range=30"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["kind"], "repeat")
        self.assertEqual(
            response.data["data"][0]["id"], first_booking.reservation_number
        )
        self.assertNotEqual(
            response.data["data"][0]["id"], latest_booking.reservation_number
        )

    def test_reservation_list_orders_nearest_date_first(self):
        far_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )
        near_later_time_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0),
            status=BookingStatus.RESERVED,
        )
        near_earlier_time_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=1),
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get(
            "/api/v1/admin/reservations?status=approved&date_range=30"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data["data"]],
            [
                near_earlier_time_booking.reservation_number,
                near_later_time_booking.reservation_number,
                far_booking.reservation_number,
            ],
        )

    def test_team_reservation_response_uses_user_nickname_as_reserver_name(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get(
            f"/api/v1/admin/reservations/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["team_name"], self.team.name)
        self.assertEqual(
            response.data["data"]["reserver_name"], self.member_user.nickname
        )

    def test_approved_reservation_list_limits_future_date_range(self):
        in_range_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=6),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )
        Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.get(
            "/api/v1/admin/reservations?status=approved&date_range=7"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(
            response.data["data"][0]["id"], in_range_booking.reservation_number
        )

    def test_pending_reservation_list_limits_future_date_range(self):
        in_range_booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=6),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )
        Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get(
            "/api/v1/admin/reservations?status=pending&date_range=7"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pagination"]["total_count"], 1)
        self.assertEqual(
            response.data["data"][0]["id"], in_range_booking.reservation_number
        )

    def test_staff_can_cancel_reservation(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.patch(
            f"/api/v1/admin/reservations/{booking.reservation_number}/cancel"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True})
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELED)
        self.assertEqual(booking.canceled_by_id, self.admin_user.id)

    def test_approve_returns_business_error_when_already_approved(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.patch(
            f"/api/v1/admin/reservations/{booking.reservation_number}/approve"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "ALREADY_APPROVED")

    def test_conflict_check_returns_overlapping_reservation(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.PENDING,
        )

        response = self.client.get(
            "/api/v1/admin/reservations/conflicts",
            {
                "room_id": self.room.id,
                "date": self.today.isoformat(),
                "start_time": "10:30:00",
                "end_time": "11:30:00",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["id"], booking.reservation_number)
        self.assertEqual(response.data["data"][0]["status"], "pending")

    def test_conflict_check_rejects_past_date(self):
        response = self.client.get(
            "/api/v1/admin/reservations/conflicts",
            {
                "room_id": self.room.id,
                "date": (self.today - timedelta(days=1)).isoformat(),
                "start_time": "10:30:00",
                "end_time": "11:30:00",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")
        self.assertIn("date", response.data["errors"])

    def test_staff_can_cancel_repeat_reservation_occurrences(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
            repeat_group_id=uuid4(),
            repeat_weekdays=[2, 4],
            repeat_start_date=self.today,
            repeat_end_date=self.today,
        )

        response = self.client.patch(
            f"/api/v1/admin/reservations/{booking.reservation_number}/cancel-occurrences",
            {"dates": [self.today.isoformat()]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "ok": True,
                "data": {"canceled_occurrence_dates": [self.today.isoformat()]},
            },
        )
        booking.refresh_from_db()
        self.assertEqual(booking.canceled_occurrence_dates, [self.today.isoformat()])

    def test_cancel_occurrences_returns_business_error_for_single_reservation(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.member_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=BookingStatus.RESERVED,
        )

        response = self.client.patch(
            f"/api/v1/admin/reservations/{booking.reservation_number}/cancel-occurrences",
            {"dates": [self.today.isoformat()]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["error_code"], "NOT_REPEAT_RESERVATION")
