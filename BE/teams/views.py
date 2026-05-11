import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api_exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
)
from common.service_exceptions import BaseServiceError
from common.swagger import openapi_exception_response
from teams.exceptions import (
    AlreadyTeamMemberError,
    DuplicatedTeamColorError,
    DuplicatedTeamNameError,
    ForbiddenTeamAccessError,
    ForbiddenTeamLeaderError,
    InvalidTeamColorError,
    InvalidTeamMemberError,
    NotFoundTeamError,
    NotFoundTeamMemberError,
    NotFoundUserError,
)
from teams.serializers import (
    TeamColorListSerializer,
    TeamConfigRequestSerializer,
    TeamConfigSerializer,
    TeamDetailSerializer,
    TeamMemberAddRequestSerializer,
    TeamMemberListSerializer,
    TeamMemberRemoveRequestSerializer,
)
from teams.services import TeamCommandService, TeamQueryService

logger = logging.getLogger(__name__)


class TeamColorsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="team_id",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="팀 수정 화면에서 현재 팀의 색상은 사용 가능으로 표시하기 위한 팀 ID",
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=TeamColorListSerializer,
                description="팀 색상 목록 조회 성공",
            ),
            403: openapi_exception_response(ForbiddenTeamAccessError),
            404: openapi_exception_response(NotFoundTeamError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="미리 등록된 팀 색상 목록과 현재 사용 가능 여부를 조회합니다.",
    )
    def get(self, request):
        team_id = request.query_params.get("team_id")
        try:
            colors = TeamQueryService.get_colors(
                user=request.user,
                team_id=int(team_id) if team_id else None,
            )
        except ValueError as e:
            raise BadRequestException() from e
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except ForbiddenTeamAccessError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to get team colors.")
            raise InternalServerErrorException() from e

        return Response(TeamColorListSerializer(colors).data, status=status.HTTP_200_OK)


class TeamDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TeamDetailSerializer,
                description="팀 상세 정보 조회 성공",
            ),
            403: openapi_exception_response(ForbiddenTeamAccessError),
            404: openapi_exception_response(NotFoundTeamError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀 이름, 색상, 멤버 목록, 내 팀장 여부를 조회합니다.",
    )
    def get(self, request, team_id: int):
        try:
            team = TeamQueryService.get_detail(user=request.user, team_id=team_id)
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except ForbiddenTeamAccessError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to get team detail.")
            raise InternalServerErrorException() from e

        return Response(TeamDetailSerializer(team).data, status=status.HTTP_200_OK)


class TeamMembersView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TeamMemberListSerializer,
                description="팀 멤버 목록 조회 성공",
            ),
            403: openapi_exception_response(ForbiddenTeamAccessError),
            404: openapi_exception_response(NotFoundTeamError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀에 속한 멤버는 팀 안의 모든 멤버를 볼 수 있습니다.",
    )
    def get(self, request, team_id: int):
        try:
            members = TeamQueryService.get_members(user=request.user, team_id=team_id)
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except ForbiddenTeamAccessError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to get team members.")
            raise InternalServerErrorException() from e

        return Response(
            TeamMemberListSerializer(members).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=TeamMemberAddRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=TeamMemberListSerializer,
                description="멤버 추가 성공",
            ),
            400: openapi_exception_response(InvalidTeamColorError),
            403: openapi_exception_response(
                ForbiddenTeamAccessError,
                ForbiddenTeamLeaderError,
            ),
            404: openapi_exception_response(NotFoundTeamError, NotFoundUserError),
            409: openapi_exception_response(AlreadyTeamMemberError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀에 멤버를 추가합니다. 팀장만 멤버를 추가할 수 있습니다.",
    )
    def post(self, request, team_id: int):
        serializer = TeamMemberAddRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            members = TeamCommandService.add_member(
                user=request.user,
                team_id=team_id,
                target_nickname=serializer.validated_data["nickname"],
            )
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except NotFoundUserError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except (ForbiddenTeamAccessError, ForbiddenTeamLeaderError) as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except AlreadyTeamMemberError as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to add team member.")
            raise InternalServerErrorException() from e

        return Response(
            TeamMemberListSerializer(members).data,
            status=status.HTTP_200_OK,
        )


class TeamMemberView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="member_id",
                required=True,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="제거할 멤버의 사용자 ID",
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=TeamMemberListSerializer,
                description="멤버 제거 성공",
            ),
            400: openapi_exception_response(InvalidTeamMemberError),
            403: openapi_exception_response(
                ForbiddenTeamAccessError,
                ForbiddenTeamLeaderError,
            ),
            404: openapi_exception_response(NotFoundTeamError, NotFoundTeamMemberError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀에서 멤버를 제거합니다. 팀장만 멤버를 제거할 수 있습니다.",
    )
    def delete(self, request, team_id: int, member_id: int):
        try:
            members = TeamCommandService.remove_member(
                user=request.user,
                team_id=team_id,
                target_user_id=member_id,
            )
        except InvalidTeamMemberError as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except NotFoundTeamMemberError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except (ForbiddenTeamAccessError, ForbiddenTeamLeaderError) as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to remove team member.")
            raise InternalServerErrorException() from e

        return Response(
            TeamMemberListSerializer(members).data,
            status=status.HTTP_200_OK,
        )


class TeamLeaderView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeamMemberRemoveRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=TeamConfigSerializer,
                description="팀장 위임 성공",
            ),
            400: openapi_exception_response(InvalidTeamMemberError),
            403: openapi_exception_response(
                ForbiddenTeamAccessError,
                ForbiddenTeamLeaderError,
            ),
            404: openapi_exception_response(NotFoundTeamError, NotFoundTeamMemberError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀장 권한을 다른 멤버에게 위임합니다. 현재 팀장만 수행할 수 있습니다.",
    )
    def patch(self, request, team_id: int):
        serializer = TeamMemberRemoveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            team = TeamCommandService.delegate_leader(
                user=request.user,
                team_id=team_id,
                target_user_id=serializer.validated_data["user_id"],
            )
        except InvalidTeamMemberError as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except NotFoundTeamMemberError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except (ForbiddenTeamAccessError, ForbiddenTeamLeaderError) as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to delegate team leader.")
            raise InternalServerErrorException() from e

        return Response(TeamConfigSerializer(team).data, status=status.HTTP_200_OK)


class TeamConfigView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeamConfigRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=TeamConfigSerializer,
                description="팀 정보 수정 성공",
            ),
            400: openapi_exception_response(),
            403: openapi_exception_response(
                ForbiddenTeamAccessError,
                ForbiddenTeamLeaderError,
            ),
            404: openapi_exception_response(NotFoundTeamError),
            409: openapi_exception_response(
                DuplicatedTeamNameError,
                DuplicatedTeamColorError,
            ),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀 이름과 대표 색상을 변경합니다. 팀장만 수행할 수 있습니다. 대표 색상은 등록된 색상 중 사용 가능한 색상만 선택할 수 있습니다.",
    )
    def patch(self, request, team_id: int):
        serializer = TeamConfigRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            team = TeamCommandService.update_config(
                user=request.user,
                team_id=team_id,
                name=serializer.validated_data.get("name"),
                color_id=serializer.validated_data.get("color_id"),
            )
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except (ForbiddenTeamAccessError, ForbiddenTeamLeaderError) as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except InvalidTeamColorError as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except (
            DuplicatedTeamNameError,
            DuplicatedTeamColorError,
        ) as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            logger.exception("Failed to update team config.")
            raise InternalServerErrorException() from e

        return Response(TeamConfigSerializer(team).data, status=status.HTTP_200_OK)
