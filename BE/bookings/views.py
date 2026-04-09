from datetime import date
import logging

from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from drf_spectacular.types import OpenApiTypes

from common.service_exceptions import BaseServiceError
from common.swagger import openapi_exception_response
from common.api_exceptions import (
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
)

from bookings.services import BookingCheckService
from bookings.exceptions import NotFoundStudioRoomError

logger = logging.getLogger(__name__)


class SlotSerializer(serializers.Serializer):
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    name = serializers.CharField(required=True)
    color = serializers.CharField(required=True)


class DayBookingCheckSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    date = serializers.DateField(required=True)
    open_time = serializers.TimeField(required=True)
    close_time = serializers.TimeField(required=True)
    status = serializers.CharField(required=True)
    slot = SlotSerializer(many=True, required=True)


class CheckBookingQueryParamsSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, format="%Y-%m-%d")


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
                required=True,
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
        query_params_serializer = CheckBookingQueryParamsSerializer(
            data=request.query_params
        )
        query_params_serializer.is_valid(raise_exception=True)
        date = query_params_serializer.validated_data.get("date", None)

        try:
            day_booking_check = BookingCheckService.check_day_booking(
                room_id=room_id,
                target_date=date,
            )

        except NotFoundStudioRoomError as e:
            raise NotFoundException(message=e.message, code=e.code) from e

        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            DayBookingCheckSerializer(day_booking_check).data,
            status=status.HTTP_200_OK,
        )


class MonthDateColorSerializer(serializers.Serializer):
    date = serializers.DateField(required=True)
    color = serializers.ListField(child=serializers.CharField())


class MonthBookingSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    year = serializers.IntegerField(required=True)
    month = serializers.IntegerField(required=True)
    days = MonthDateColorSerializer(many=True, required=True)


class MonthBookingView(APIView):
    permission_classes = [AllowAny]

    class MonthBookingQueryParamsSerializer(serializers.Serializer):
        month = serializers.IntegerField(required=False)
        year = serializers.IntegerField(required=False)

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
                description="일정을 조회할 월 (1-12 형식) year 파라미터가 제공되지 않으면 현재 연도의 월별 일정을 조회합니다.",
            ),
            OpenApiParameter(
                name="year",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="일정을 조회할 연도 (YYYY 형식) month 파라미터가 제공되지 않으면 현재 연도의 월별 일정을 조회합니다.",
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
        query_params_serializer = MonthBookingSerializer(data=request.query_params)
        query_params_serializer.is_valid(raise_exception=True)
        try:
            target_month = query_params_serializer.validated_data.get("month", None)
            target_year = query_params_serializer.validated_data.get("year", None)

            month_booking_check = BookingCheckService.check_month_booking(
                room_id=room_id,
                target_date=date(
                    year=target_year,
                    month=target_month,
                    day=1,
                ),
            )
        except NotFoundStudioRoomError as e:
            raise NotFoundException(message=e.message, code=e.code) from e

        except Exception as e:
            raise InternalServerErrorException() from e

        return Response(
            MonthBookingSerializer(month_booking_check).data,
            status=status.HTTP_200_OK,
        )
