from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from backoffice.permissions import IsStaffAdmin
from backoffice.serializers import (
    AdminReservationConflictQuerySerializer,
    AdminReservationConflictSerializer,
    AdminReservationCancelOccurrencesRequestSerializer,
    AdminReservationCancelOccurrencesSerializer,
    AdminReservationCreateRequestSerializer,
    AdminReservationListQuerySerializer,
    AdminReservationSerializer,
    AdminDayOffListQuerySerializer,
    AdminDayOffRequestSerializer,
    AdminDayOffSerializer,
    AdminLogQuerySerializer,
    AdminLogSerializer,
    AdminRoomListQuerySerializer,
    AdminRoomRequestSerializer,
    AdminRoomSerializer,
    AdminTeamColorQuerySerializer,
    AdminTeamColorSerializer,
    AdminTeamCreateRequestSerializer,
    AdminTeamDetailSerializer,
    AdminTeamLeaderRequestSerializer,
    AdminTeamListQuerySerializer,
    AdminTeamMemberAddRequestSerializer,
    AdminTeamSerializer,
    AdminTeamUpdateRequestSerializer,
    AdminUserListQuerySerializer,
    AdminUserSerializer,
)
from backoffice.services import (
    AdminReservationService,
    AdminDayOffService,
    AdminLogService,
    AdminRoomService,
    AdminTeamService,
    AdminUserService,
    AlreadyApprovedError,
    BlockedUserIncludedError,
    ColorUnavailableError,
    ConflictReservationError,
    DuplicateRoomNameError,
    DuplicateTeamNameError,
    NotTeamMemberError,
    NotRepeatReservationError,
    ReservationConflictError,
    RoomInactiveError,
)
from bookings.models import Booking
from studios.models import RoomClosure, StudioRoom
from teams.models import Team

User = get_user_model()


def admin_success(data=None, pagination=None, status_code=status.HTTP_200_OK):
    body = {
        "ok": True,
        "data": data if data is not None else {},
    }
    if pagination is not None:
        body["pagination"] = pagination
    return Response(body, status=status_code)


def admin_error(
    error_code: str,
    message: str,
    data=None,
    status_code=status.HTTP_200_OK,
):
    body = {
        "ok": False,
        "error_code": error_code,
        "message": message,
    }
    if data is not None:
        body["data"] = data
    return Response(body, status=status_code)


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminUserListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        user_list = AdminUserService.get_users(
            q=serializer.validated_data.get("q"),
            team_id=serializer.validated_data.get("team_id"),
            status=serializer.validated_data["status"],
            page=serializer.validated_data["page"],
            page_size=serializer.validated_data["page_size"],
        )
        return admin_success(
            data=AdminUserSerializer(user_list.users, many=True).data,
            pagination=user_list.pagination,
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request, user_id: int):
        try:
            user = AdminUserService.get_user(user_id=user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return admin_success(data=AdminUserSerializer(user).data)


class AdminUserBlockView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def patch(self, request, user_id: int):
        try:
            blocked = AdminUserService.block_user(user_id=user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not blocked:
            return admin_error(
                error_code="ALREADY_BLOCKED",
                message="이미 차단된 사용자입니다.",
            )
        user = User.objects.get(id=user_id)
        AdminLogService.record(
            admin=request.user,
            category="사용자",
            action="사용자를 차단했습니다",
            target=user.nickname or "",
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminUserUnblockView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def patch(self, request, user_id: int):
        try:
            unblocked = AdminUserService.unblock_user(user_id=user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not unblocked:
            return admin_error(
                error_code="NOT_BLOCKED",
                message="차단 상태가 아닌 사용자입니다.",
            )
        user = User.objects.get(id=user_id)
        AdminLogService.record(
            admin=request.user,
            category="사용자",
            action="사용자 차단을 해제했습니다",
            target=user.nickname or "",
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminTeamColorListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminTeamColorQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            colors = AdminTeamService.get_colors(
                team_id=serializer.validated_data.get("team_id")
            )
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(data=AdminTeamColorSerializer(colors, many=True).data)


class AdminTeamListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminTeamListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        team_list = AdminTeamService.get_teams(
            q=serializer.validated_data.get("q"),
            leader_id=serializer.validated_data.get("leader_id"),
            page=serializer.validated_data["page"],
            page_size=serializer.validated_data["page_size"],
            admin_user=request.user,
        )
        return admin_success(
            data=AdminTeamSerializer(team_list.teams, many=True).data,
            pagination=team_list.pagination,
        )

    def post(self, request):
        serializer = AdminTeamCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            team = AdminTeamService.create_team(
                admin_user=request.user,
                name=serializer.validated_data["name"],
                color_id=serializer.validated_data["color_id"],
                leader_id=serializer.validated_data["leader_id"],
            )
        except DuplicateTeamNameError:
            return admin_error(
                error_code="DUPLICATE_TEAM_NAME",
                message="이미 존재하는 팀 이름입니다.",
            )
        except ColorUnavailableError:
            return admin_error(
                error_code="COLOR_UNAVAILABLE",
                message="이미 사용 중인 팀 색상입니다.",
            )
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        AdminLogService.record(
            admin=request.user,
            category="팀",
            action="팀을 생성했습니다",
            target=team.name,
        )
        return admin_success(
            data=AdminTeamDetailSerializer(team).data,
            status_code=status.HTTP_201_CREATED,
        )


class AdminTeamDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request, team_id: int):
        try:
            team = AdminTeamService.get_team(team_id=team_id)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(data=AdminTeamDetailSerializer(team).data)

    def patch(self, request, team_id: int):
        serializer = AdminTeamUpdateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            team = AdminTeamService.update_team(
                team_id=team_id,
                name=serializer.validated_data.get("name"),
                color_id=serializer.validated_data.get("color_id"),
            )
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except DuplicateTeamNameError:
            return admin_error(
                error_code="DUPLICATE_TEAM_NAME",
                message="이미 존재하는 팀 이름입니다.",
            )
        except ColorUnavailableError:
            return admin_error(
                error_code="COLOR_UNAVAILABLE",
                message="이미 사용 중인 팀 색상입니다.",
            )
        AdminLogService.record(
            admin=request.user,
            category="팀",
            action="팀 설정을 수정했습니다",
            target=team.name,
        )
        return admin_success(data=AdminTeamDetailSerializer(team).data)

    def delete(self, request, team_id: int):
        try:
            team = AdminTeamService.get_team(team_id=team_id)
            AdminTeamService.delete_team(team_id=team_id)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        AdminLogService.record(
            admin=request.user,
            category="팀",
            action="팀을 삭제했습니다",
            target=team.name,
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminTeamMemberListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def post(self, request, team_id: int):
        serializer = AdminTeamMemberAddRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AdminTeamService.add_members(
                team_id=team_id,
                user_ids=serializer.validated_data["user_ids"],
            )
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except BlockedUserIncludedError:
            return admin_error(
                error_code="BLOCKED_USER_INCLUDED",
                message="차단된 사용자는 팀에 추가할 수 없습니다.",
            )
        team = AdminTeamService.get_team(team_id=team_id)
        AdminLogService.record(
            admin=request.user,
            category="팀",
            action="팀원을 추가했습니다",
            target=team.name,
            detail=", ".join(str(user_id) for user_id in result.added_user_ids),
        )
        return admin_success(data=result.__dict__)


class AdminTeamLeaderView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def patch(self, request, team_id: int):
        serializer = AdminTeamLeaderRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AdminTeamService.change_leader(
                admin_user=request.user,
                team_id=team_id,
                leader_id=serializer.validated_data["leader_id"],
            )
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except NotTeamMemberError:
            return admin_error(
                error_code="NOT_TEAM_MEMBER",
                message="팀원 중에서만 팀장을 변경할 수 있습니다.",
            )
        team = AdminTeamService.get_team(team_id=team_id)
        AdminLogService.record(
            admin=request.user,
            category="팀",
            action="팀장을 변경했습니다",
            target=team.name,
            detail=result.leader_nickname or "",
        )
        return admin_success(data=result.__dict__)


class AdminRoomListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminRoomListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        rooms = AdminRoomService.get_rooms(
            include_inactive=serializer.validated_data["include_inactive"]
        )
        return admin_success(data=AdminRoomSerializer(rooms, many=True).data)

    def post(self, request):
        serializer = AdminRoomRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            room = AdminRoomService.create_room(
                name=serializer.validated_data["name"],
                description=serializer.validated_data.get("description"),
                open_time=serializer.validated_data["open_time"],
                close_time=serializer.validated_data["close_time"],
                is_open_all_day=serializer.validated_data["is_open_all_day"],
            )
        except DuplicateRoomNameError:
            return admin_error(
                error_code="DUPLICATE_ROOM_NAME",
                message="이미 존재하는 합주실 이름입니다.",
            )
        AdminLogService.record(
            admin=request.user,
            category="합주실",
            action="합주실을 생성했습니다",
            target=room.name,
        )
        return admin_success(
            data=AdminRoomSerializer(room).data,
            status_code=status.HTTP_201_CREATED,
        )


class AdminRoomDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request, room_id: int):
        try:
            room = AdminRoomService.get_room(room_id=room_id)
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(data=AdminRoomSerializer(room).data)

    def put(self, request, room_id: int):
        serializer = AdminRoomRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            room = AdminRoomService.update_room(
                room_id=room_id,
                name=serializer.validated_data["name"],
                description=serializer.validated_data.get("description"),
                open_time=serializer.validated_data["open_time"],
                close_time=serializer.validated_data["close_time"],
                is_open_all_day=serializer.validated_data["is_open_all_day"],
            )
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except DuplicateRoomNameError:
            return admin_error(
                error_code="DUPLICATE_ROOM_NAME",
                message="이미 존재하는 합주실 이름입니다.",
            )
        AdminLogService.record(
            admin=request.user,
            category="합주실",
            action="합주실을 수정했습니다",
            target=room.name,
        )
        return admin_success(data=AdminRoomSerializer(room).data)

    def delete(self, request, room_id: int):
        try:
            room = AdminRoomService.get_room(room_id=room_id)
            AdminRoomService.delete_room(room_id=room_id)
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        AdminLogService.record(
            admin=request.user,
            category="합주실",
            action="합주실을 삭제했습니다",
            target=room.name,
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminReservationListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminReservationListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        reservation_list = AdminReservationService.get_reservations(
            status=serializer.validated_data["status"],
            date_range=serializer.validated_data["date_range"],
            team_type=serializer.validated_data["team_type"],
            room_id=serializer.validated_data.get("room_id"),
            page=serializer.validated_data["page"],
            page_size=serializer.validated_data["page_size"],
        )
        return admin_success(
            data=AdminReservationSerializer(
                reservation_list.reservations, many=True
            ).data,
            pagination=reservation_list.pagination,
        )

    def post(self, request):
        serializer = AdminReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reservation = AdminReservationService.create_owner_reservation(
                admin_user=request.user,
                room_id=serializer.validated_data["room_id"],
                target_date=serializer.validated_data["date"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
                team_id=serializer.validated_data.get("team_id"),
                title=serializer.validated_data.get("title", ""),
                memo=serializer.validated_data.get("memo", ""),
                force_cancel_conflict_ids=serializer.validated_data[
                    "force_cancel_conflict_ids"
                ],
            )
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except RoomInactiveError:
            return admin_error(
                error_code="ROOM_INACTIVE",
                message="비활성화된 합주실입니다.",
            )
        except ConflictReservationError:
            return admin_error(
                error_code="CONFLICT_RESERVATION",
                message="해당 시간에 이미 예약이 있습니다.",
            )
        AdminLogService.record(
            admin=request.user,
            category="예약",
            action="예약을 생성했습니다",
            target=reservation.room_name,
            detail=f"{reservation.date} / {reservation.start_time}~{reservation.end_time}",
        )
        return admin_success(
            data=AdminReservationSerializer(reservation).data,
            status_code=status.HTTP_201_CREATED,
        )


class AdminReservationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request, reservation_id: int):
        try:
            reservation = AdminReservationService.get_reservation(
                reservation_id=reservation_id
            )
        except Booking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(data=AdminReservationSerializer(reservation).data)


class AdminReservationApproveView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def patch(self, request, reservation_id: int):
        try:
            reservation = AdminReservationService.approve_reservation(
                reservation_id=reservation_id
            )
        except Booking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except AlreadyApprovedError:
            return admin_error(
                error_code="ALREADY_APPROVED",
                message="이미 승인된 예약입니다.",
            )
        AdminLogService.record(
            admin=request.user,
            category="예약",
            action="예약을 승인했습니다",
            target=reservation.room_name,
            detail=str(reservation.id),
        )
        return admin_success(data=AdminReservationSerializer(reservation).data)


class AdminReservationCancelView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def patch(self, request, reservation_id: int):
        try:
            reservation = AdminReservationService.get_reservation(
                reservation_id=reservation_id
            )
            AdminReservationService.cancel_reservation(reservation_id=reservation_id)
        except Booking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        AdminLogService.record(
            admin=request.user,
            category="예약",
            action="예약을 취소했습니다",
            target=reservation.room_name,
            detail=str(reservation.id),
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminReservationCancelOccurrencesView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def patch(self, request, reservation_id: int):
        serializer = AdminReservationCancelOccurrencesRequestSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        try:
            canceled_dates = AdminReservationService.cancel_occurrences(
                reservation_id=reservation_id,
                dates=serializer.validated_data["dates"],
            )
        except Booking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except NotRepeatReservationError:
            return admin_error(
                error_code="NOT_REPEAT_RESERVATION",
                message="반복 예약이 아닙니다.",
            )
        AdminLogService.record(
            admin=request.user,
            category="예약",
            action="반복 예약 회차를 취소했습니다",
            target=str(reservation_id),
            detail=", ".join(canceled_dates),
        )
        return admin_success(
            data=AdminReservationCancelOccurrencesSerializer(
                {"canceled_occurrence_dates": canceled_dates}
            ).data
        )


class AdminReservationConflictView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminReservationConflictQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            conflicts = AdminReservationService.get_conflicts(
                room_id=serializer.validated_data["room_id"],
                target_date=serializer.validated_data["date"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
                exclude_id=serializer.validated_data.get("exclude_id"),
            )
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(
            data=AdminReservationConflictSerializer(conflicts, many=True).data
        )


class AdminDayOffListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminDayOffListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        day_off_list = AdminDayOffService.get_day_offs(
            room_id=serializer.validated_data.get("room_id"),
            page=serializer.validated_data["page"],
            page_size=serializer.validated_data["page_size"],
        )
        return admin_success(
            data=AdminDayOffSerializer(day_off_list.day_offs, many=True).data,
            pagination=day_off_list.pagination,
        )

    def post(self, request):
        serializer = AdminDayOffRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            day_off = AdminDayOffService.create_day_off(
                room_id=serializer.validated_data.get("room_id"),
                day_off_type=serializer.validated_data["type"],
                start_date=serializer.validated_data["start_date"],
                end_date=serializer.validated_data["end_date"],
                start_time=serializer.validated_data.get("start_time"),
                end_time=serializer.validated_data.get("end_time"),
                is_all_day=serializer.validated_data["is_all_day"],
                reason=serializer.validated_data.get("reason"),
                force_cancel_reservation_ids=serializer.validated_data[
                    "force_cancel_reservation_ids"
                ],
            )
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except ReservationConflictError as e:
            return admin_error(
                error_code="RESERVATION_CONFLICT",
                message="해당 기간에 겹치는 예약이 있습니다.",
                data=AdminReservationConflictSerializer(e.conflicts, many=True).data,
            )
        AdminLogService.record(
            admin=request.user,
            category="쉬는날",
            action=f"쉬는날 - {day_off.type}을 설정했습니다",
            target=day_off.room_name,
            detail=f"{day_off.start_date}~{day_off.end_date}",
        )
        return admin_success(
            data=AdminDayOffSerializer(day_off).data,
            status_code=status.HTTP_201_CREATED,
        )


class AdminDayOffConflictView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def post(self, request):
        serializer = AdminDayOffRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            conflicts = AdminDayOffService.check_conflicts(
                room_id=serializer.validated_data.get("room_id"),
                start_date=serializer.validated_data["start_date"],
                end_date=serializer.validated_data["end_date"],
                start_time=serializer.validated_data.get("start_time"),
                end_time=serializer.validated_data.get("end_time"),
                is_all_day=serializer.validated_data["is_all_day"],
            )
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(
            data=AdminReservationConflictSerializer(conflicts, many=True).data
        )


class AdminDayOffDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def delete(self, request, day_off_id: int):
        try:
            day_offs = AdminDayOffService.get_day_offs(
                room_id=None, page=1, page_size=100
            ).day_offs
            day_off = next(day_off for day_off in day_offs if day_off.id == day_off_id)
            AdminDayOffService.delete_day_off(day_off_id=day_off_id)
        except RoomClosure.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except StopIteration:
            return Response(status=status.HTTP_404_NOT_FOUND)
        AdminLogService.record(
            admin=request.user,
            category="쉬는날",
            action="쉬는날을 삭제했습니다",
            target=day_off.room_name,
            detail=f"{day_off.start_date}~{day_off.end_date}",
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminLogListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get(self, request):
        serializer = AdminLogQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        log_list = AdminLogService.get_logs(
            category=serializer.validated_data.get("category"),
            created_after=serializer.validated_data.get("created_after"),
            cursor=serializer.validated_data.get("cursor"),
            page_size=serializer.validated_data["page_size"],
        )
        return admin_success(
            data=AdminLogSerializer(log_list.logs, many=True).data,
            pagination=log_list.pagination,
        )
