from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from bookings.models import Booking, BookingStatus, BookingType
from studios.models import ClosureType, RoomClosure, StudioRoom, StudioRoomStatus
from teams.models import Team, TeamMember, TeamMemberStatus, TeamStatus

User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class BookingAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(kakao_id=3001, nickname="tester")
        self.member_user = User.objects.create_user(kakao_id=3002, nickname="member")
        self.other_user = User.objects.create_user(kakao_id=3003, nickname="other")

        self.room = StudioRoom.objects.create(
            name="b201",
            open_time=time(9, 0),
            close_time=time(22, 0),
            status=StudioRoomStatus.ACTIVE,
        )
        self.inactive_room = StudioRoom.objects.create(
            name="b202",
            open_time=time(9, 0),
            close_time=time(22, 0),
            status=StudioRoomStatus.INACTIVE,
        )

        self.team = Team.objects.create(
            name="team-a",
            color="000000",
            owner=self.user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.user,
            status=TeamMemberStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.member_user,
            status=TeamMemberStatus.ACTIVE,
        )

        self.other_team = Team.objects.create(
            name="team-b",
            color="111111",
            owner=self.other_user,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=self.other_team,
            user=self.other_user,
            status=TeamMemberStatus.ACTIVE,
        )

        self.today = date.today()
        self.tomorrow = self.today + timedelta(days=1)
        self._authenticate(self.user)

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

    # 존재하지 않는 룸의 일별 조회는 404를 반환하는지 검증한다.
    def test_day_booking_view_returns_404_for_missing_room(self):
        response = self.client.get("/api/v1/rooms/999999/day/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_STUDIO_ROOM")

    # 존재하지 않는 룸의 월별 조회는 404를 반환하는지 검증한다.
    def test_month_booking_view_returns_404_for_missing_room(self):
        response = self.client.get("/api/v1/rooms/999999/month/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_STUDIO_ROOM")

    # 소속되지 않은 팀으로 팀 예약 조회를 시도하면 금지되는지 검증한다.
    def test_get_team_reservations_rejects_non_member_team_filter(self):
        response = self.client.get(
            f"/api/v1/reservations/team?team_id={self.other_team.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")

    # 개인 예약 생성 시 예약 번호와 표시값이 정상 반환되는지 검증한다.
    def test_create_private_reservation_succeeds(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/private",
            {
                "start_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(response.data["reservations"][0]["type"], BookingType.PRIVATE)
        self.assertEqual(response.data["reservations"][0]["name"], self.user.nickname)
        self.assertEqual(response.data["reservations"][0]["color"], "#DADADA")
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"],
            user=self.user,
        )
        self.assertEqual(booking.status, BookingStatus.PENDING)

    # 비활성 룸에는 개인 예약을 생성할 수 없는지 검증한다.
    def test_create_private_reservation_rejects_inactive_room(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.inactive_room.id}/private",
            {
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
            f"/api/v1/reservations/{self.room.id}/private",
            {
                "start_date": self.today.isoformat(),
                "start_time": "09:30:00",
                "end_time": "10:30:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "DUPLICATED_RESERVATION")

    # 개인 예약 생성 시 예약 시간은 30분 단위만 허용되는지 검증한다.
    def test_create_private_reservation_rejects_non_half_hour_time(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/private",
            {
                "start_date": self.today.isoformat(),
                "start_time": "09:15:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_BOOKING_TIME")

    # 팀 예약 생성 시 소속 팀 정보와 색상이 정상 반환되는지 검증한다.
    def test_create_team_reservation_succeeds(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/team",
            {
                "team_id": self.team.id,
                "start_date": self.today.isoformat(),
                "start_time": "19:00:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(response.data["reservations"][0]["type"], BookingType.TEAM)
        self.assertEqual(response.data["reservations"][0]["team_id"], self.team.id)
        self.assertEqual(response.data["reservations"][0]["team_name"], self.team.name)
        self.assertEqual(response.data["reservations"][0]["color"], self.team.color)
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"],
            user=self.user,
        )
        self.assertEqual(booking.status, BookingStatus.PENDING)

    # 소속되지 않은 팀으로 팀 예약 생성 시 금지되는지 검증한다.
    def test_create_team_reservation_rejects_non_member_team(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/team",
            {
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
            f"/api/v1/reservations/{self.room.id}/team",
            {
                "team_id": self.team.id,
                "start_date": self.today.isoformat(),
                "start_time": "19:10:00",
                "end_time": "20:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_BOOKING_TIME")

    # 개인 예약 생성 시 count만큼 1주 간격 반복 예약이 생성되는지 검증한다.
    def test_create_private_reservation_creates_weekly_recurring_bookings(self):
        response = self.client.post(
            f"/api/v1/reservations/{self.room.id}/private",
            {
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
            [item["date"] for item in response.data["reservations"]],
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

    # 팀 예약은 같은 팀의 다른 활성 멤버도 취소할 수 있는지 검증한다.
    def test_cancel_team_reservation_allows_active_team_member(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            team=self.team,
            booking_type=BookingType.TEAM,
            reservation_date=self.today,
            start_time=time(19, 0),
            end_time=time(20, 0),
        )
        self._authenticate(self.member_user)

        response = self.client.delete(
            f"/api/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELED)
        self.assertIsNotNone(booking.canceled_at)

    # 예약 취소 시 권한 없는 사용자는 거부되는지 검증한다.
    def test_cancel_reservation_rejects_unauthorized_user(self):
        booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        self._authenticate(self.other_user)

        response = self.client.delete(
            f"/api/v1/reservations/number/{booking.reservation_number}"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "FORBIDDEN_TEAM_BOOKING")

    # 존재하지 않는 예약 번호 취소 시 404를 반환하는지 검증한다.
    def test_cancel_reservation_returns_404_for_missing_booking(self):
        response = self.client.delete("/api/v1/reservations/number/999999")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "NOT_FOUND_BOOKING")

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
        self.assertEqual(response.data["slot"][0]["status"], BookingStatus.RESERVED)
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

    # 비활성 룸의 월별 조회는 모든 날짜를 예약 불가로 반환하는지 검증한다.
    def test_month_booking_view_marks_all_days_disabled_for_inactive_room(self):
        response = self.client.get(
            f"/api/v1/rooms/{self.inactive_room.id}/month/?year={self.today.year}&month={self.today.month}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(item["disabled"] for item in response.data["days"]))

    def _authenticate(self, user):
        refresh = JWTRefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
