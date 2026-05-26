import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.exceptions import (
    AlreadyCanceledReservationError,
    DuplicatedReservationError,
    ForbiddenTeamBookingError,
    InactiveStudioRoomError,
    InvalidBookingTimeError,
    NoAvailableRepeatDatesError,
    NotFoundBookingError,
    NotFoundStudioRoomError,
    NotFoundTeamError,
    OutsideOperatingHoursError,
)
from bookings.models import BookingStatus
from bookings.serializers import (
    DayBookingCheckSerializer,
    DayBookingQueryParamsSerializer,
    MonthBookingQueryParamsSerializer,
    MonthBookingSerializer,
    MyReservationListSerializer,
    PrivateReservationCreateRequestSerializer,
    PrivateReservationCreateResponseSerializer,
    ReservationDetailSerializer,
    RepeatReservationCheckResponseSerializer,
    TeamReservationCreateRequestSerializer,
    TeamReservationCreateResponseSerializer,
    TeamReservationListQueryParamsSerializer,
    TeamReservationListSerializer,
    UnifiedReservationCreateRequestSerializer,
    UnifiedReservationCreateResponseSerializer,
    UnifiedReservationListQueryParamsSerializer,
    UnifiedReservationListSerializer,
    ReservationListQueryParamsSerializer,
)
from bookings.services import (
    BookingCheckService,
    ReservationCommandService,
    ReservationQueryService,
)
from common.api_exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
)
from common.service_exceptions import BaseServiceError
from common.swagger import openapi_exception_response

logger = logging.getLogger(__name__)


class DayBookingView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="room_id",
                required=True,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="일정을 조회할 스튜디오 룸의 ID",
            ),
            OpenApiParameter(
                name="date",
                required=False,
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="일정을 조회할 날짜 (YYYY-MM-DD 형식)",
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=DayBookingCheckSerializer,
                description="일정 조회 성공",
            ),
            400: openapi_exception_response(),
            404: openapi_exception_response(NotFoundStudioRoomError),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def get(self, request, room_id: int):
        serializer = DayBookingQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            day_booking_check = BookingCheckService.check_day_booking(
                room_id=room_id,
                target_date=serializer.validated_data.get("date"),
            )
        except NotFoundStudioRoomError as e:
            raise NotFoundException(message=e.message, code=e.code) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            DayBookingCheckSerializer(day_booking_check).data,
            status=status.HTTP_200_OK,
        )


class MonthBookingView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="room_id",
                required=True,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="일정을 조회할 스튜디오 룸의 ID",
            ),
            OpenApiParameter(
                name="month",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="일정을 조회할 월 (1-12 형식)",
            ),
            OpenApiParameter(
                name="year",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="일정을 조회할 연도 (YYYY 형식)",
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=MonthBookingSerializer,
                description="일정 조회 성공",
            ),
            400: openapi_exception_response(),
            404: openapi_exception_response(NotFoundStudioRoomError),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def get(self, request, room_id: int):
        serializer = MonthBookingQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            month_booking_check = BookingCheckService.check_month_booking(
                room_id=room_id,
                target_year=serializer.validated_data.get("year"),
                target_month=serializer.validated_data.get("month"),
            )
        except NotFoundStudioRoomError as e:
            raise NotFoundException(message=e.message, code=e.code) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            MonthBookingSerializer(month_booking_check).data,
            status=status.HTTP_200_OK,
        )


class MyReservationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="date",
                required=False,
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="status",
                required=False,
                type=OpenApiTypes.STR,
                enum=[choice[0] for choice in BookingStatus.choices],
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="page",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="size",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=MyReservationListSerializer,
                description="내 예약 조회 성공",
            ),
            500: openapi_exception_response(BaseServiceError),
        },
        description="로그인한 사용자의 예약 목록 조회",
    )
    def get(self, request):
        serializer = ReservationListQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            reservation_list = ReservationQueryService.get_my_reservations(
                user=request.user,
                target_date=serializer.validated_data.get("date"),
                status=serializer.validated_data.get("status"),
                page=serializer.validated_data["page"],
                size=serializer.validated_data["size"],
            )
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            MyReservationListSerializer(reservation_list).data,
            status=status.HTTP_200_OK,
        )


class TeamReservationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="team_id",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="date",
                required=False,
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="status",
                required=False,
                type=OpenApiTypes.STR,
                enum=[choice[0] for choice in BookingStatus.choices],
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="page",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="size",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
        responses={
            200: OpenApiResponse(
                response=TeamReservationListSerializer,
                description="내 팀 예약 조회 성공",
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(NotFoundTeamError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="로그인한 사용자가 속한 팀의 예약 목록 조회",
    )
    def get(self, request):
        serializer = TeamReservationListQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            reservation_list = ReservationQueryService.get_team_reservations(
                user=request.user,
                team_id=serializer.validated_data.get("team_id"),
                target_date=serializer.validated_data.get("date"),
                status=serializer.validated_data.get("status"),
                page=serializer.validated_data["page"],
                size=serializer.validated_data["size"],
            )
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            TeamReservationListSerializer(reservation_list).data,
            status=status.HTTP_200_OK,
        )


class ReservationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[UnifiedReservationListQueryParamsSerializer],
        responses={
            200: OpenApiResponse(
                response=UnifiedReservationListSerializer,
                description="통합 예약 목록 조회 성공",
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(NotFoundTeamError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="로그인한 사용자의 개인 예약과 소속 팀 예약을 옵션 기반으로 통합 조회",
    )
    def get(self, request):
        serializer = UnifiedReservationListQueryParamsSerializer(
            data=request.query_params
        )
        serializer.is_valid(raise_exception=True)

        try:
            reservation_list = ReservationQueryService.get_reservations(
                user=request.user,
                period=serializer.validated_data["period"],
                kind=serializer.validated_data.get("kind"),
                reservation_type=serializer.validated_data.get("type"),
                status=serializer.validated_data.get("status"),
                team_id=serializer.validated_data.get("team_id"),
                sort=serializer.validated_data["sort"],
                page=serializer.validated_data["page"],
                size=serializer.validated_data["size"],
            )
        except NotFoundTeamError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            UnifiedReservationListSerializer(reservation_list).data,
            status=status.HTTP_200_OK,
        )


class PrivateReservationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=PrivateReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=PrivateReservationCreateResponseSerializer,
                description="개인 예약 생성 성공",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
            ),
            409: openapi_exception_response(DuplicatedReservationError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="개인 예약 생성",
    )
    def post(self, request, room_id: int):
        serializer = PrivateReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reservation = ReservationCommandService.create_private_reservation(
                user=request.user,
                room_id=room_id,
                start_date=serializer.validated_data["start_date"],
                count=serializer.validated_data["count"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
            )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except (NotFoundStudioRoomError, InactiveStudioRoomError) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except DuplicatedReservationError as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            PrivateReservationCreateResponseSerializer(reservation).data,
            status=status.HTTP_200_OK,
        )


class ReservationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=UnifiedReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=UnifiedReservationCreateResponseSerializer,
                description="통합 예약 생성 성공",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
                NotFoundTeamError,
            ),
            409: openapi_exception_response(
                DuplicatedReservationError,
                NoAvailableRepeatDatesError,
            ),
            500: openapi_exception_response(BaseServiceError),
        },
        description="type 옵션으로 개인/팀 예약을 통합 생성",
    )
    def post(self, request, room_id: int):
        serializer = UnifiedReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            if serializer.validated_data["type"] == "team":
                if serializer.validated_data["count"] > 1:
                    reservation = (
                        ReservationCommandService.create_team_repeat_reservation(
                            user=request.user,
                            room_id=room_id,
                            team_id=serializer.validated_data["team_id"],
                            start_date=serializer.validated_data["start_date"],
                            count=serializer.validated_data["count"],
                            start_time=serializer.validated_data["start_time"],
                            end_time=serializer.validated_data["end_time"],
                        )
                    )
                else:
                    reservation = ReservationCommandService.create_team_reservation(
                        user=request.user,
                        room_id=room_id,
                        team_id=serializer.validated_data["team_id"],
                        start_date=serializer.validated_data["start_date"],
                        count=serializer.validated_data["count"],
                        start_time=serializer.validated_data["start_time"],
                        end_time=serializer.validated_data["end_time"],
                    )
            elif serializer.validated_data["count"] > 1:
                reservation = (
                    ReservationCommandService.create_private_repeat_reservation(
                        user=request.user,
                        room_id=room_id,
                        start_date=serializer.validated_data["start_date"],
                        count=serializer.validated_data["count"],
                        start_time=serializer.validated_data["start_time"],
                        end_time=serializer.validated_data["end_time"],
                    )
                )
            else:
                reservation = ReservationCommandService.create_private_reservation(
                    user=request.user,
                    room_id=room_id,
                    start_date=serializer.validated_data["start_date"],
                    count=serializer.validated_data["count"],
                    start_time=serializer.validated_data["start_time"],
                    end_time=serializer.validated_data["end_time"],
                )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except (
            NotFoundStudioRoomError,
            InactiveStudioRoomError,
            NotFoundTeamError,
        ) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except (DuplicatedReservationError, NoAvailableRepeatDatesError) as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            UnifiedReservationCreateResponseSerializer(
                ReservationCommandService.to_unified_reservation_list(reservation)
            ).data,
            status=status.HTTP_200_OK,
        )


class PrivateRepeatReservationCheckView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=PrivateReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=RepeatReservationCheckResponseSerializer,
                description="개인 반복 예약 가능 여부 확인 성공",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
            ),
            409: openapi_exception_response(NoAvailableRepeatDatesError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="개인 반복 예약 생성 전 주차별 가능 여부를 확인합니다. 충돌 주차는 conflict_occurrences에 담아 반환합니다.",
    )
    def post(self, request, room_id: int):
        serializer = PrivateReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = ReservationCommandService.check_repeat_reservation(
                room_id=room_id,
                start_date=serializer.validated_data["start_date"],
                count=serializer.validated_data["count"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
            )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except (NotFoundStudioRoomError, InactiveStudioRoomError) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        data = RepeatReservationCheckResponseSerializer(result).data
        if not result.available_occurrences:
            data.update(
                {
                    "code": NoAvailableRepeatDatesError.code,
                    "message": NoAvailableRepeatDatesError.message,
                }
            )
            return Response(data, status=status.HTTP_409_CONFLICT)
        return Response(data, status=status.HTTP_200_OK)


class RepeatReservationCheckView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=UnifiedReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=RepeatReservationCheckResponseSerializer,
                description="통합 반복 예약 가능 여부 확인 성공",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
                NotFoundTeamError,
            ),
            409: openapi_exception_response(NoAvailableRepeatDatesError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="type 옵션으로 개인/팀 반복 예약 가능 여부를 통합 확인",
    )
    def post(self, request, room_id: int):
        serializer = UnifiedReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            if serializer.validated_data["type"] == "team":
                result = ReservationCommandService.check_team_repeat_reservation(
                    user=request.user,
                    room_id=room_id,
                    team_id=serializer.validated_data["team_id"],
                    start_date=serializer.validated_data["start_date"],
                    count=serializer.validated_data["count"],
                    start_time=serializer.validated_data["start_time"],
                    end_time=serializer.validated_data["end_time"],
                )
            else:
                result = ReservationCommandService.check_repeat_reservation(
                    room_id=room_id,
                    start_date=serializer.validated_data["start_date"],
                    count=serializer.validated_data["count"],
                    start_time=serializer.validated_data["start_time"],
                    end_time=serializer.validated_data["end_time"],
                )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except (
            NotFoundStudioRoomError,
            InactiveStudioRoomError,
            NotFoundTeamError,
        ) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        data = RepeatReservationCheckResponseSerializer(result).data
        if not result.available_occurrences:
            data.update(
                {
                    "code": NoAvailableRepeatDatesError.code,
                    "message": NoAvailableRepeatDatesError.message,
                }
            )
            return Response(data, status=status.HTTP_409_CONFLICT)
        return Response(data, status=status.HTTP_200_OK)


class PrivateRepeatReservationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=PrivateReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=PrivateReservationCreateResponseSerializer,
                description="개인 반복 예약 생성 성공. 충돌 주차는 건너뛰고 가능한 주차만 생성합니다.",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
            ),
            409: openapi_exception_response(NoAvailableRepeatDatesError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="개인 반복 예약을 생성합니다. 생성 시점에 다시 충돌을 검사하고, 충돌 주차는 skipped_occurrences로 반환합니다.",
    )
    def post(self, request, room_id: int):
        serializer = PrivateReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reservation = ReservationCommandService.create_private_repeat_reservation(
                user=request.user,
                room_id=room_id,
                start_date=serializer.validated_data["start_date"],
                count=serializer.validated_data["count"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
            )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except (NotFoundStudioRoomError, InactiveStudioRoomError) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except NoAvailableRepeatDatesError as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            PrivateReservationCreateResponseSerializer(reservation).data,
            status=status.HTTP_200_OK,
        )


class TeamReservationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeamReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=TeamReservationCreateResponseSerializer,
                description="팀 예약 생성 성공",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
                NotFoundTeamError,
            ),
            409: openapi_exception_response(DuplicatedReservationError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀 예약 생성",
    )
    def post(self, request, room_id: int):
        serializer = TeamReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reservation = ReservationCommandService.create_team_reservation(
                user=request.user,
                room_id=room_id,
                team_id=serializer.validated_data["team_id"],
                start_date=serializer.validated_data["start_date"],
                count=serializer.validated_data["count"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
            )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except (
            NotFoundStudioRoomError,
            InactiveStudioRoomError,
            NotFoundTeamError,
        ) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except DuplicatedReservationError as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            TeamReservationCreateResponseSerializer(reservation).data,
            status=status.HTTP_200_OK,
        )


class TeamRepeatReservationCheckView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeamReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=RepeatReservationCheckResponseSerializer,
                description="팀 반복 예약 가능 여부 확인 성공",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
                NotFoundTeamError,
            ),
            409: openapi_exception_response(NoAvailableRepeatDatesError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀 반복 예약 생성 전 주차별 가능 여부를 확인합니다. 충돌 주차는 conflict_occurrences에 담아 반환합니다.",
    )
    def post(self, request, room_id: int):
        serializer = TeamReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = ReservationCommandService.check_team_repeat_reservation(
                user=request.user,
                room_id=room_id,
                team_id=serializer.validated_data["team_id"],
                start_date=serializer.validated_data["start_date"],
                count=serializer.validated_data["count"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
            )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except (
            NotFoundStudioRoomError,
            InactiveStudioRoomError,
            NotFoundTeamError,
        ) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        data = RepeatReservationCheckResponseSerializer(result).data
        if not result.available_occurrences:
            data.update(
                {
                    "code": NoAvailableRepeatDatesError.code,
                    "message": NoAvailableRepeatDatesError.message,
                }
            )
            return Response(data, status=status.HTTP_409_CONFLICT)
        return Response(data, status=status.HTTP_200_OK)


class TeamRepeatReservationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeamReservationCreateRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=TeamReservationCreateResponseSerializer,
                description="팀 반복 예약 생성 성공. 충돌 주차는 건너뛰고 가능한 주차만 생성합니다.",
            ),
            400: openapi_exception_response(
                InvalidBookingTimeError,
                OutsideOperatingHoursError,
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(
                NotFoundStudioRoomError,
                InactiveStudioRoomError,
                NotFoundTeamError,
            ),
            409: openapi_exception_response(NoAvailableRepeatDatesError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="팀 반복 예약을 생성합니다. 생성 시점에 다시 충돌을 검사하고, 충돌 주차는 skipped_occurrences로 반환합니다.",
    )
    def post(self, request, room_id: int):
        serializer = TeamReservationCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reservation = ReservationCommandService.create_team_repeat_reservation(
                user=request.user,
                room_id=room_id,
                team_id=serializer.validated_data["team_id"],
                start_date=serializer.validated_data["start_date"],
                count=serializer.validated_data["count"],
                start_time=serializer.validated_data["start_time"],
                end_time=serializer.validated_data["end_time"],
            )
        except (InvalidBookingTimeError, OutsideOperatingHoursError) as e:
            raise BadRequestException(code=e.code, message=e.message) from e
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except (
            NotFoundStudioRoomError,
            InactiveStudioRoomError,
            NotFoundTeamError,
        ) as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except NoAvailableRepeatDatesError as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            TeamReservationCreateResponseSerializer(reservation).data,
            status=status.HTTP_200_OK,
        )


class CancelReservationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=ReservationDetailSerializer,
                description="예약 상세 조회 성공",
            ),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(NotFoundBookingError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="예약 번호로 예약 상세 조회",
    )
    def get(self, request, reservation_number: int):
        try:
            detail = ReservationQueryService.get_reservation_detail(
                user=request.user,
                reservation_number=reservation_number,
            )
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except NotFoundBookingError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            ReservationDetailSerializer(detail).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(description="예약 취소 성공"),
            403: openapi_exception_response(ForbiddenTeamBookingError),
            404: openapi_exception_response(NotFoundBookingError),
            409: openapi_exception_response(AlreadyCanceledReservationError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="예약 번호로 예약 취소",
    )
    def delete(self, request, reservation_number: int):
        try:
            ReservationCommandService.cancel_reservation(
                user=request.user,
                reservation_number=reservation_number,
            )
        except ForbiddenTeamBookingError as e:
            raise ForbiddenException(code=e.code, message=e.message) from e
        except NotFoundBookingError as e:
            raise NotFoundException(code=e.code, message=e.message) from e
        except AlreadyCanceledReservationError as e:
            raise ConflictException(code=e.code, message=e.message) from e
        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(status=status.HTTP_200_OK)
