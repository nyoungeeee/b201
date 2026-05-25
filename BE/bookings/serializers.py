from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers

from bookings.models import BookingStatus


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "일정 슬롯",
            value={
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "name": "홍길동",
                "memo": "개인 연습",
                "color": "#FF6B6B",
                "status": "approved",
            },
            response_only=True,
        )
    ]
)
class SlotSerializer(serializers.Serializer):
    start_time = serializers.TimeField(required=True, help_text="예약 시작 시간")
    end_time = serializers.TimeField(required=True, help_text="예약 종료 시간")
    name = serializers.CharField(required=True, help_text="예약자 또는 팀 표시 이름")
    memo = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="예약 메모. 없으면 빈 문자열입니다.",
    )
    color = serializers.CharField(
        required=True, help_text="캘린더에 표시할 예약 색상 HEX 코드"
    )
    status = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="예약 상태. 빈 슬롯 또는 휴무 정보에서는 null일 수 있습니다.",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "일별 예약 조회 응답",
            value={
                "room_id": 1,
                "room_name": "A룸",
                "date": "2026-05-22",
                "open_time": "09:00:00",
                "close_time": "23:00:00",
                "status": "open",
                "slot": [
                    {
                        "start_time": "10:00:00",
                        "end_time": "12:00:00",
                        "name": "홍길동",
                        "memo": "개인 연습",
                        "color": "#FF6B6B",
                        "status": "approved",
                    }
                ],
            },
            response_only=True,
        )
    ]
)
class DayBookingCheckSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True, help_text="조회한 합주실 ID")
    room_name = serializers.CharField(required=True, help_text="조회한 합주실 이름")
    date = serializers.DateField(required=True, help_text="조회한 날짜")
    open_time = serializers.TimeField(
        required=True, help_text="해당 날짜의 합주실 운영 시작 시간"
    )
    close_time = serializers.TimeField(
        required=True, help_text="해당 날짜의 합주실 운영 종료 시간"
    )
    status = serializers.CharField(
        required=True, help_text="해당 날짜의 합주실 운영 상태"
    )
    slot = SlotSerializer(
        many=True, required=True, help_text="해당 날짜의 예약 슬롯 목록"
    )


class DayBookingQueryParamsSerializer(serializers.Serializer):
    date = serializers.DateField(
        required=False,
        format="%Y-%m-%d",
        help_text="조회할 날짜. 생략하면 서버 기준 기본 날짜를 사용합니다. 형식: YYYY-MM-DD",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "월별 날짜 색상",
            value={"date": "2026-05-22", "color": ["#FF6B6B"], "disabled": False},
            response_only=True,
        )
    ]
)
class MonthDateColorSerializer(serializers.Serializer):
    date = serializers.DateField(required=True, help_text="월별 캘린더에 표시할 날짜")
    color = serializers.ListField(
        child=serializers.CharField(help_text="해당 날짜에 표시할 예약 색상 HEX 코드"),
        help_text="해당 날짜에 표시할 예약 색상 목록",
    )
    disabled = serializers.BooleanField(
        required=True,
        help_text="예약 불가 또는 비활성 날짜인지 여부",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "월별 예약 조회 응답",
            value={
                "room_id": 1,
                "room_name": "A룸",
                "year": 2026,
                "month": 5,
                "days": [
                    {"date": "2026-05-22", "color": ["#FF6B6B"], "disabled": False}
                ],
            },
            response_only=True,
        )
    ]
)
class MonthBookingSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True, help_text="조회한 합주실 ID")
    room_name = serializers.CharField(required=True, help_text="조회한 합주실 이름")
    year = serializers.IntegerField(required=True, help_text="조회한 연도")
    month = serializers.IntegerField(required=True, help_text="조회한 월")
    days = MonthDateColorSerializer(
        many=True, required=True, help_text="월별 날짜 표시 정보"
    )


class MonthBookingQueryParamsSerializer(serializers.Serializer):
    month = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=12,
        help_text="조회할 월. 1부터 12까지 입력합니다.",
    )
    year = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="조회할 연도. 생략하면 서버 기준 기본 연도를 사용합니다.",
    )


class ReservationStatusField(serializers.ChoiceField):
    def __init__(self, **kwargs):
        kwargs.setdefault(
            "help_text", "예약 상태 필터. pending 또는 approved를 사용할 수 있습니다."
        )
        super().__init__(choices=BookingStatus.choices, **kwargs)


class UnifiedReservationStatusField(serializers.ChoiceField):
    def __init__(self, **kwargs):
        kwargs.setdefault(
            "help_text",
            "예약 상태 필터. PENDING, APPROVED, REJECTED, CANCELED를 사용할 수 있습니다.",
        )
        super().__init__(
            choices=["PENDING", "APPROVED", "REJECTED", "CANCELED"],
            **kwargs,
        )


class UnifiedReservationStatusListField(serializers.ListField):
    child = UnifiedReservationStatusField()

    def to_internal_value(self, data):
        if isinstance(data, str):
            data = [data]
        return super().to_internal_value(data)


class ReservationStatusListField(serializers.ListField):
    child = ReservationStatusField(
        help_text="예약 상태 필터. pending 또는 approved를 사용할 수 있습니다."
    )

    def to_internal_value(self, data):
        if isinstance(data, str):
            data = [data]
        return super().to_internal_value(data)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "개인 예약 항목",
            value={
                "reservation_number": 10,
                "room_id": 1,
                "room_name": "A룸",
                "date": "2026-05-22",
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "kind": "single",
                "repeat_count": None,
                "type": "private",
                "name": "홍길동",
                "memo": "개인 연습",
                "color": "#FF6B6B",
                "status": "approved",
            },
            response_only=True,
        )
    ]
)
class ReservationItemSerializer(serializers.Serializer):
    reservation_number = serializers.IntegerField(required=True, help_text="예약 번호")
    room_id = serializers.IntegerField(required=True, help_text="예약된 합주실 ID")
    room_name = serializers.CharField(required=True, help_text="예약된 합주실 이름")
    date = serializers.DateField(required=True, help_text="예약 날짜")
    start_time = serializers.TimeField(required=True, help_text="예약 시작 시간")
    end_time = serializers.TimeField(required=True, help_text="예약 종료 시간")
    kind = serializers.CharField(
        required=False,
        help_text="예약 종류. single 또는 repeat",
    )
    repeat_count = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="반복 예약 전체 회차. 단건 예약이면 null입니다.",
    )
    type = serializers.CharField(
        required=True, help_text="예약 유형. private 또는 team"
    )
    name = serializers.CharField(
        required=True, help_text="예약 목록에 표시할 예약자 또는 팀 이름"
    )
    memo = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="예약 메모. 없으면 빈 문자열입니다.",
    )
    color = serializers.CharField(required=True, help_text="예약 표시 색상 HEX 코드")
    status = serializers.CharField(required=True, help_text="예약 상태")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 예약 항목",
            value={
                "reservation_number": 11,
                "room_id": 1,
                "room_name": "A룸",
                "date": "2026-05-22",
                "start_time": "13:00:00",
                "end_time": "15:00:00",
                "kind": "single",
                "repeat_count": None,
                "type": "team",
                "name": "B201 밴드",
                "memo": "합주",
                "color": "#4D96FF",
                "status": "pending",
                "team_id": 1,
                "team_name": "B201 밴드",
            },
            response_only=True,
        )
    ]
)
class TeamReservationItemSerializer(ReservationItemSerializer):
    team_id = serializers.IntegerField(required=True, help_text="팀 예약의 팀 ID")
    team_name = serializers.CharField(required=True, help_text="팀 예약의 팀 이름")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "내 예약 목록",
            value={"reservations": []},
            response_only=True,
        )
    ]
)
class MyReservationListSerializer(serializers.Serializer):
    reservations = ReservationItemSerializer(
        many=True, required=True, help_text="내 개인 예약 목록"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 예약 목록",
            value={"reservations": []},
            response_only=True,
        )
    ]
)
class TeamReservationListSerializer(serializers.Serializer):
    reservations = TeamReservationItemSerializer(
        many=True, required=True, help_text="팀 예약 목록"
    )


class RepeatOccurrenceSerializer(serializers.Serializer):
    week = serializers.IntegerField(required=True, help_text="반복 예약 회차")
    date = serializers.DateField(required=True, help_text="반복 예약 대상 날짜")


class RepeatConflictOccurrenceSerializer(RepeatOccurrenceSerializer):
    code = serializers.CharField(required=True, help_text="예약 불가 사유 코드")
    message = serializers.CharField(required=True, help_text="예약 불가 사유 메시지")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "반복 예약 가능 여부 확인 응답",
            value={
                "available_occurrences": [
                    {"week": 1, "date": "2026-05-22"},
                    {"week": 3, "date": "2026-06-05"},
                ],
                "conflict_occurrences": [
                    {
                        "week": 2,
                        "date": "2026-05-29",
                        "code": "DUPLICATED_RESERVATION",
                        "message": "이미 예약된 시간입니다.",
                    }
                ],
            },
            response_only=True,
        )
    ]
)
class RepeatReservationCheckResponseSerializer(serializers.Serializer):
    available_occurrences = RepeatOccurrenceSerializer(
        many=True,
        required=True,
        help_text="예약 가능한 반복 회차 목록",
    )
    conflict_occurrences = RepeatConflictOccurrenceSerializer(
        many=True,
        required=True,
        help_text="충돌로 예약할 수 없는 반복 회차 목록",
    )


class ReservationListQueryParamsSerializer(serializers.Serializer):
    date = serializers.DateField(
        required=False,
        format="%Y-%m-%d",
        help_text="조회 기준 날짜. 형식: YYYY-MM-DD",
    )
    status = ReservationStatusListField(
        required=False,
        help_text="예약 상태 필터. 문자열 하나 또는 배열로 전달할 수 있습니다.",
    )
    page = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
        help_text="조회할 페이지 번호",
    )
    size = serializers.IntegerField(
        required=False,
        min_value=1,
        default=20,
        help_text="페이지당 예약 개수",
    )


class TeamReservationListQueryParamsSerializer(ReservationListQueryParamsSerializer):
    team_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="특정 팀 예약만 조회할 때 사용하는 팀 ID",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "개인 예약 생성 요청",
            value={
                "start_date": "2026-05-22",
                "count": 1,
                "start_time": "10:00:00",
                "end_time": "12:00:00",
            },
            request_only=True,
        )
    ]
)
class PrivateReservationCreateRequestSerializer(serializers.Serializer):
    start_date = serializers.DateField(
        required=True,
        format="%Y-%m-%d",
        help_text="예약 시작 날짜. 형식: YYYY-MM-DD",
    )
    count = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
        help_text="생성할 예약 개수. 단건 예약은 1입니다.",
    )
    start_time = serializers.TimeField(required=True, help_text="예약 시작 시간")
    end_time = serializers.TimeField(required=True, help_text="예약 종료 시간")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 예약 생성 요청",
            value={
                "start_date": "2026-05-22",
                "count": 1,
                "start_time": "13:00:00",
                "end_time": "15:00:00",
                "team_id": 1,
            },
            request_only=True,
        )
    ]
)
class TeamReservationCreateRequestSerializer(PrivateReservationCreateRequestSerializer):
    team_id = serializers.IntegerField(
        required=True, min_value=1, help_text="예약할 팀 ID"
    )


class UnifiedReservationCreateRequestSerializer(
    PrivateReservationCreateRequestSerializer
):
    type = serializers.ChoiceField(
        choices=["private", "team"],
        required=True,
        help_text="예약 유형. private 또는 team",
    )
    team_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="팀 예약일 때 예약할 팀 ID",
    )

    def validate(self, attrs):
        if attrs["type"] == "team" and attrs.get("team_id") is None:
            raise serializers.ValidationError(
                {"team_id": "팀 예약에는 team_id가 필요합니다."}
            )
        return attrs


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "개인 예약 생성 응답",
            value={"reservations": []},
            response_only=True,
        )
    ]
)
class PrivateReservationCreateResponseSerializer(serializers.Serializer):
    reservations = ReservationItemSerializer(
        many=True, required=True, help_text="생성된 개인 예약 목록"
    )
    skipped_occurrences = RepeatConflictOccurrenceSerializer(
        many=True,
        required=False,
        allow_null=True,
        help_text="반복 예약 생성 중 충돌로 건너뛴 회차 목록",
    )


class UnifiedReservationListQueryParamsSerializer(serializers.Serializer):
    sort = serializers.ChoiceField(
        choices=["upcoming", "latest"],
        default="upcoming",
        required=False,
        help_text="정렬 옵션. upcoming은 다가오는 가장 가까운 예약순, latest는 최신 예약 생성순입니다.",
    )
    period = serializers.ChoiceField(
        choices=["upcoming", "past"],
        default="upcoming",
        required=False,
        help_text="조회 기간. upcoming 또는 past",
    )
    kind = serializers.ChoiceField(
        choices=["single", "repeat"],
        required=False,
        help_text="예약 종류. single 또는 repeat",
    )
    type = serializers.ChoiceField(
        choices=["private", "team"],
        required=False,
        help_text="예약 유형. private 또는 team",
    )
    status = UnifiedReservationStatusListField(
        required=False,
        help_text="예약 상태 필터. 문자열 하나 또는 배열로 전달할 수 있습니다.",
    )
    team_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="특정 팀 예약만 조회할 때 사용하는 팀 ID",
    )
    page = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
        help_text="조회할 페이지 번호",
    )
    size = serializers.IntegerField(
        required=False,
        min_value=1,
        default=20,
        help_text="페이지당 예약 개수",
    )


class UnifiedReservationItemSerializer(serializers.Serializer):
    reservation_number = serializers.IntegerField(required=True)
    repeat_group_id = serializers.UUIDField(required=False, allow_null=True)
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    start_date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)
    end_date = serializers.DateField(required=True)
    end_time = serializers.TimeField(required=True)
    kind = serializers.CharField(required=True)
    repeat_count = serializers.IntegerField(required=False, allow_null=True)
    conflict_count = serializers.IntegerField(required=True)
    type = serializers.CharField(required=True)
    team_id = serializers.IntegerField(required=False, allow_null=True)
    team_name = serializers.CharField(required=False, allow_null=True)
    color = serializers.CharField(required=True)
    applicant_id = serializers.IntegerField(required=True)
    applicant_name = serializers.CharField(required=True)
    status = serializers.CharField(required=True)
    created_at = serializers.DateTimeField(required=True)


class UnifiedReservationListSerializer(serializers.Serializer):
    period = serializers.CharField(required=True)
    reservations = UnifiedReservationItemSerializer(many=True, required=True)
    pagination = serializers.DictField(required=True)


class ReservationRepeatDetailSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    count = serializers.IntegerField(required=True)
    weekdays = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
    )


class ReservationOccurrenceDetailSerializer(serializers.Serializer):
    week = serializers.IntegerField(required=False, allow_null=True)
    reservation_number = serializers.IntegerField(required=False, allow_null=True)
    date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)
    end_date = serializers.DateField(required=True)
    end_time = serializers.TimeField(required=True)
    status = serializers.CharField(required=True)
    canceled_at = serializers.DateTimeField(required=False, allow_null=True)
    canceled_by = serializers.IntegerField(required=False, allow_null=True)
    reason_code = serializers.CharField(required=False, allow_null=True)
    can_reapply = serializers.BooleanField(required=True)


class ReservationDetailSerializer(serializers.Serializer):
    reservation_number = serializers.IntegerField(required=True)
    repeat_group_id = serializers.UUIDField(required=False, allow_null=True)
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    start_date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)
    end_date = serializers.DateField(required=True)
    end_time = serializers.TimeField(required=True)
    kind = serializers.CharField(required=True)
    repeat_count = serializers.IntegerField(required=False, allow_null=True)
    conflict_count = serializers.IntegerField(required=True)
    type = serializers.CharField(required=True)
    team_id = serializers.IntegerField(required=False, allow_null=True)
    team_name = serializers.CharField(required=False, allow_null=True)
    applicant_id = serializers.IntegerField(required=True)
    applicant_name = serializers.CharField(required=True)
    memo = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=True)
    status = serializers.CharField(required=True)
    created_at = serializers.DateTimeField(required=True)
    approved_at = serializers.DateTimeField(required=False, allow_null=True)
    canceled_at = serializers.DateTimeField(required=False, allow_null=True)
    canceled_by = serializers.IntegerField(required=False, allow_null=True)
    repeat = ReservationRepeatDetailSerializer(required=False, allow_null=True)
    occurrences = ReservationOccurrenceDetailSerializer(many=True, required=True)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 예약 생성 응답",
            value={"reservations": []},
            response_only=True,
        )
    ]
)
class TeamReservationCreateResponseSerializer(serializers.Serializer):
    reservations = TeamReservationItemSerializer(
        many=True, required=True, help_text="생성된 팀 예약 목록"
    )
    skipped_occurrences = RepeatConflictOccurrenceSerializer(
        many=True,
        required=False,
        allow_null=True,
        help_text="반복 예약 생성 중 충돌로 건너뛴 회차 목록",
    )


class UnifiedReservationCreateResponseSerializer(serializers.Serializer):
    reservations = UnifiedReservationItemSerializer(
        many=True, required=True, help_text="생성된 예약 목록"
    )
    skipped_occurrences = RepeatConflictOccurrenceSerializer(
        many=True,
        required=False,
        allow_null=True,
        help_text="반복 예약 생성 중 충돌로 건너뛴 회차 목록",
    )
