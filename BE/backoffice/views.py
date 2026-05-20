from django.contrib.auth import get_user_model

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from backoffice.permissions import IsStaffAdmin
from backoffice.serializers import (
    AdminBusinessErrorSerializer,
    AdminDayOffListQuerySerializer,
    AdminDayOffListResponseSerializer,
    AdminDayOffRequestSerializer,
    AdminDayOffResponseSerializer,
    AdminDayOffSerializer,
    AdminEmptySuccessSerializer,
    AdminLogListResponseSerializer,
    AdminLogQuerySerializer,
    AdminLogSerializer,
    AdminReservationCancelOccurrencesRequestSerializer,
    AdminReservationCancelOccurrencesResponseSerializer,
    AdminReservationCancelOccurrencesSerializer,
    AdminReservationConflictListResponseSerializer,
    AdminReservationConflictQuerySerializer,
    AdminReservationConflictSerializer,
    AdminReservationCreateRequestSerializer,
    AdminReservationListQuerySerializer,
    AdminReservationListResponseSerializer,
    AdminReservationResponseSerializer,
    AdminReservationSerializer,
    AdminRoomListQuerySerializer,
    AdminRoomListResponseSerializer,
    AdminRoomRequestSerializer,
    AdminRoomResponseSerializer,
    AdminRoomSerializer,
    AdminTeamColorQuerySerializer,
    AdminTeamColorListResponseSerializer,
    AdminTeamColorSerializer,
    AdminTeamCreateRequestSerializer,
    AdminTeamDetailSerializer,
    AdminTeamDetailResponseSerializer,
    AdminTeamLeaderRequestSerializer,
    AdminTeamLeaderResponseSerializer,
    AdminTeamListQuerySerializer,
    AdminTeamListResponseSerializer,
    AdminTeamMemberAddRequestSerializer,
    AdminTeamMemberAddResponseSerializer,
    AdminTeamSerializer,
    AdminTeamUpdateRequestSerializer,
    AdminUserListQuerySerializer,
    AdminUserListResponseSerializer,
    AdminUserResponseSerializer,
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

    @extend_schema(
        operation_id="admin_users_list",
        parameters=[AdminUserListQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminUserListResponseSerializer,
                description="사용자 목록 조회 성공. 닉네임/이메일 검색, 팀 소속, 차단 상태 필터와 페이지네이션을 지원합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="관리자 화면에서 회원 목록을 조회합니다. 탈퇴 사용자는 목록에서 제외되며 status는 normal 또는 blocked로 반환됩니다.",
    )
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

    @extend_schema(
        operation_id="admin_users_retrieve",
        request=None,
        responses={
            200: OpenApiResponse(
                response=AdminUserResponseSerializer,
                description="사용자 상세 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 사용자를 찾을 수 없습니다."),
        },
        description="관리자가 특정 사용자의 기본 정보와 현재 소속 팀 ID 목록을 조회합니다.",
    )
    def get(self, request, user_id: int):
        try:
            user = AdminUserService.get_user(user_id=user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return admin_success(data=AdminUserSerializer(user).data)


class AdminUserBlockView(APIView):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    @extend_schema(
        operation_id="admin_users_block",
        request=None,
        responses={
            200: OpenApiResponse(
                response=AdminEmptySuccessSerializer,
                description="사용자 차단 성공. 이미 차단된 사용자는 ok=false, ALREADY_BLOCKED로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 사용자를 찾을 수 없습니다."),
        },
        description="사용자를 차단 상태로 변경합니다. 성공 시 관리자 액션 로그가 기록됩니다.",
    )
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

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=AdminEmptySuccessSerializer,
                description="사용자 차단 해제 성공. 차단 상태가 아니면 ok=false, NOT_BLOCKED로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 사용자를 찾을 수 없습니다."),
        },
        description="차단된 사용자를 정상 상태로 되돌립니다. 성공 시 관리자 액션 로그가 기록됩니다.",
    )
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

    @extend_schema(
        parameters=[AdminTeamColorQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminTeamColorListResponseSerializer,
                description="팀 색상 목록 조회 성공. 현재 팀의 색상은 team_id를 넘기면 available=true로 반환됩니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(
                description="team_id에 해당하는 팀을 찾을 수 없습니다."
            ),
        },
        description="관리자가 팀 생성/수정 화면에서 사용할 팀 색상 목록과 사용 가능 여부를 조회합니다. 색상 ID는 문자열이 아니라 TeamColor의 숫자 PK입니다.",
    )
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

    @extend_schema(
        operation_id="admin_teams_list",
        parameters=[AdminTeamListQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminTeamListResponseSerializer,
                description="팀 목록 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="활성 팀 목록을 조회합니다. 팀 이름 또는 팀장 닉네임으로 검색할 수 있고, leader_id=0은 현재 요청한 사장님이 팀장인 팀을 의미합니다.",
    )
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

    @extend_schema(
        request=AdminTeamCreateRequestSerializer,
        responses={
            201: OpenApiResponse(
                response=AdminTeamDetailResponseSerializer,
                description="팀 생성 성공",
            ),
            200: OpenApiResponse(
                response=AdminBusinessErrorSerializer,
                description="팀 이름 중복(DUPLICATE_TEAM_NAME) 또는 색상 사용 불가(COLOR_UNAVAILABLE)",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(
                description="leader_id에 해당하는 사용자를 찾을 수 없습니다."
            ),
        },
        description="관리자가 새 팀을 생성합니다. leader_id=0이면 현재 요청한 사장님 계정을 팀장으로 등록합니다.",
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

    @extend_schema(
        operation_id="admin_teams_retrieve",
        request=None,
        responses={
            200: OpenApiResponse(
                response=AdminTeamDetailResponseSerializer,
                description="팀 상세 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 팀을 찾을 수 없습니다."),
        },
        description="팀 이름, 색상, 팀장, 멤버 목록을 관리자 화면에서 조회합니다.",
    )
    def get(self, request, team_id: int):
        try:
            team = AdminTeamService.get_team(team_id=team_id)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(data=AdminTeamDetailSerializer(team).data)

    @extend_schema(
        request=AdminTeamUpdateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=AdminTeamDetailResponseSerializer,
                description="팀 설정 수정 성공. 이름 중복 또는 색상 사용 불가는 ok=false로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 팀을 찾을 수 없습니다."),
        },
        description="관리자가 팀 이름 또는 대표 색상을 수정합니다. color_id는 TeamColor 숫자 PK입니다.",
    )
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

    @extend_schema(
        operation_id="admin_teams_delete",
        responses={
            200: OpenApiResponse(
                response=AdminEmptySuccessSerializer,
                description="팀 삭제 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 팀을 찾을 수 없습니다."),
        },
        description="팀을 소프트 삭제합니다. 실제 레코드는 남기고 Team.status를 DELETED로 변경합니다.",
    )
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

    @extend_schema(
        request=AdminTeamMemberAddRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=AdminTeamMemberAddResponseSerializer,
                description="팀 멤버 추가 성공. 차단 사용자가 포함되면 ok=false, BLOCKED_USER_INCLUDED로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(
                description="팀 또는 사용자 중 찾을 수 없는 리소스가 있습니다."
            ),
        },
        description="관리자가 사용자 ID 목록을 팀 멤버로 추가합니다. 이미 나간 멤버는 활성 상태로 복구됩니다.",
    )
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

    @extend_schema(
        request=AdminTeamLeaderRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=AdminTeamLeaderResponseSerializer,
                description="팀장 변경 성공. 팀원이 아닌 사용자를 지정하면 ok=false, NOT_TEAM_MEMBER로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="팀 또는 사용자를 찾을 수 없습니다."),
        },
        description="관리자가 팀장을 변경합니다. leader_id=0이면 현재 요청한 사장님 계정을 팀장으로 지정합니다.",
    )
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

    @extend_schema(
        operation_id="admin_rooms_list",
        parameters=[AdminRoomListQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminRoomListResponseSerializer,
                description="합주실 목록 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="합주실 목록을 sort_order, 생성일 순으로 조회합니다. include_inactive=true면 비활성 합주실도 함께 반환합니다.",
    )
    def get(self, request):
        serializer = AdminRoomListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        rooms = AdminRoomService.get_rooms(
            include_inactive=serializer.validated_data["include_inactive"]
        )
        return admin_success(data=AdminRoomSerializer(rooms, many=True).data)

    @extend_schema(
        request=AdminRoomRequestSerializer,
        responses={
            201: OpenApiResponse(
                response=AdminRoomResponseSerializer,
                description="합주실 생성 성공",
            ),
            200: OpenApiResponse(
                response=AdminBusinessErrorSerializer,
                description="합주실 이름 중복(DUPLICATE_ROOM_NAME)",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="관리자가 새 합주실을 생성합니다. sort_order는 서버에서 현재 최대값 + 1로 자동 부여합니다.",
    )
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

    @extend_schema(
        operation_id="admin_rooms_retrieve",
        responses={
            200: OpenApiResponse(
                response=AdminRoomResponseSerializer,
                description="합주실 상세 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 합주실을 찾을 수 없습니다."),
        },
        description="관리자가 합주실의 운영 시간, 종일 운영 여부, 활성 상태를 조회합니다.",
    )
    def get(self, request, room_id: int):
        try:
            room = AdminRoomService.get_room(room_id=room_id)
        except StudioRoom.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return admin_success(data=AdminRoomSerializer(room).data)

    @extend_schema(
        request=AdminRoomRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=AdminRoomResponseSerializer,
                description="합주실 수정 성공. 이름 중복은 ok=false, DUPLICATE_ROOM_NAME으로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 합주실을 찾을 수 없습니다."),
        },
        description="합주실 이름, 설명, 운영 시간, 종일 운영 여부를 수정합니다.",
    )
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

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AdminEmptySuccessSerializer,
                description="합주실 삭제 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 합주실을 찾을 수 없습니다."),
        },
        description="합주실을 비활성 처리합니다. 해당 합주실의 승인/대기 예약은 자동으로 취소됩니다.",
    )
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

    @extend_schema(
        operation_id="admin_reservations_list",
        parameters=[AdminReservationListQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminReservationListResponseSerializer,
                description="예약 목록 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="관리자가 대기 예약 또는 승인 예약 목록을 조회합니다. 승인 예약은 date_range로 최근 N일 범위를 제한할 수 있습니다.",
    )
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

    @extend_schema(
        request=AdminReservationCreateRequestSerializer,
        responses={
            201: OpenApiResponse(
                response=AdminReservationResponseSerializer,
                description="사장님 예약 생성 성공",
            ),
            200: OpenApiResponse(
                response=AdminBusinessErrorSerializer,
                description="비활성 합주실(ROOM_INACTIVE) 또는 예약 시간 충돌(CONFLICT_RESERVATION)",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="합주실 또는 팀을 찾을 수 없습니다."),
        },
        description="관리자가 직접 예약을 생성합니다. team_id가 없으면 사장님 개인 예약이며, title은 조회 응답의 name으로 사용됩니다.",
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

    @extend_schema(
        operation_id="admin_reservations_retrieve",
        responses={
            200: OpenApiResponse(
                response=AdminReservationResponseSerializer,
                description="예약 상세 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 예약을 찾을 수 없습니다."),
        },
        description="관리자가 예약 번호로 예약 상세 정보를 조회합니다. 반복 예약 메타 정보와 취소된 회차 날짜도 함께 반환합니다.",
    )
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

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=AdminReservationResponseSerializer,
                description="예약 승인 성공. 이미 승인된 예약은 ok=false, ALREADY_APPROVED로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 예약을 찾을 수 없습니다."),
        },
        description="대기 상태의 예약을 승인 상태로 변경합니다. 성공 시 관리자 액션 로그가 기록됩니다.",
    )
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

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=AdminEmptySuccessSerializer,
                description="예약 취소 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 예약을 찾을 수 없습니다."),
        },
        description="대기 또는 승인 예약을 취소합니다. 성공 시 관리자 액션 로그가 기록됩니다.",
    )
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

    @extend_schema(
        request=AdminReservationCancelOccurrencesRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=AdminReservationCancelOccurrencesResponseSerializer,
                description="반복 예약 회차 취소 성공. 단건 예약이면 ok=false, NOT_REPEAT_RESERVATION으로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 예약을 찾을 수 없습니다."),
        },
        description="반복 예약에서 특정 날짜 회차만 취소 처리합니다. dates는 YYYY-MM-DD 날짜 배열입니다.",
    )
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

    @extend_schema(
        parameters=[AdminReservationConflictQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminReservationConflictListResponseSerializer,
                description="예약 충돌 조회 성공. 충돌이 없으면 data는 빈 배열입니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 합주실을 찾을 수 없습니다."),
        },
        description="사장님 예약 생성 또는 수정 전에 같은 합주실/날짜/시간대와 겹치는 예약을 확인합니다.",
    )
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

    @extend_schema(
        parameters=[AdminDayOffListQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminDayOffListResponseSerializer,
                description="쉬는날 목록 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="관리자가 합주실별 쉬는날을 조회합니다. room_id를 넘기면 해당 합주실 쉬는날과 전체 합주실 쉬는날을 함께 반환합니다.",
    )
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

    @extend_schema(
        request=AdminDayOffRequestSerializer,
        responses={
            201: OpenApiResponse(
                response=AdminDayOffResponseSerializer,
                description="쉬는날 생성 성공",
            ),
            200: OpenApiResponse(
                response=AdminBusinessErrorSerializer,
                description="겹치는 예약이 있고 강제 취소 목록이 없으면 RESERVATION_CONFLICT로 응답합니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(
                description="room_id에 해당하는 합주실을 찾을 수 없습니다."
            ),
        },
        description="관리자가 특정 합주실 또는 전체 합주실 쉬는날을 생성합니다. force_cancel_reservation_ids를 넘기면 충돌 예약을 취소한 뒤 생성합니다.",
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

    @extend_schema(
        request=AdminDayOffRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=AdminReservationConflictListResponseSerializer,
                description="쉬는날 생성 전 충돌 예약 조회 성공. 충돌이 없으면 data는 빈 배열입니다.",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(
                description="room_id에 해당하는 합주실을 찾을 수 없습니다."
            ),
        },
        description="쉬는날을 생성하기 전에 해당 기간과 시간에 겹치는 예약을 확인합니다. room_id가 없으면 모든 합주실을 대상으로 검사합니다.",
    )
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

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AdminEmptySuccessSerializer,
                description="쉬는날 삭제 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
            404: OpenApiResponse(description="해당 쉬는날을 찾을 수 없습니다."),
        },
        description="관리자가 등록된 쉬는날을 삭제합니다. 성공 시 관리자 액션 로그가 기록됩니다.",
    )
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

    @extend_schema(
        parameters=[AdminLogQuerySerializer],
        responses={
            200: OpenApiResponse(
                response=AdminLogListResponseSerializer,
                description="관리자 액션 로그 목록 조회 성공",
            ),
            403: OpenApiResponse(description="관리자 권한이 없는 사용자입니다."),
        },
        description="관리자 액션 로그를 최신순으로 조회합니다. created_after와 category로 필터링하고, next_cursor로 다음 페이지를 요청합니다.",
    )
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
