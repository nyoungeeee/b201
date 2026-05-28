import base64
import binascii
from datetime import datetime

from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers


def validate_not_past_reservation_date(value):
    if value < timezone.localdate():
        raise serializers.ValidationError("과거 날짜는 예약할 수 없습니다.")
    return value


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 사용자",
            value={
                "id": 1,
                "nickname": "홍길동",
                "email": "member@example.com",
                "status": "normal",
                "joined_at": "2026-05-22",
                "team_ids": [1, 2],
            },
            response_only=True,
        )
    ]
)
class AdminUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="사용자 ID")
    nickname = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="사용자 닉네임. 미설정 사용자는 null입니다.",
    )
    email = serializers.EmailField(
        required=False,
        allow_null=True,
        help_text="사용자 이메일. 카카오에서 제공하지 않으면 null입니다.",
    )
    status = serializers.CharField(
        required=True, help_text="사용자 상태. normal 또는 blocked"
    )
    joined_at = serializers.DateField(required=True, help_text="사용자 가입일")
    team_ids = serializers.ListField(
        child=serializers.IntegerField(help_text="사용자가 소속된 팀 ID"),
        required=True,
        help_text="사용자가 현재 소속된 팀 ID 목록",
    )


class AdminUserListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="닉네임 또는 이메일 검색어",
    )
    team_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="특정 팀에 소속된 사용자만 조회할 때 사용하는 팀 ID",
    )
    status = serializers.ChoiceField(
        required=False,
        choices=["all", "normal", "blocked"],
        default="all",
        help_text="사용자 상태 필터. all, normal, blocked 중 하나",
    )
    page = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
        help_text="조회할 페이지 번호",
    )
    page_size = serializers.IntegerField(
        required=False,
        min_value=1,
        default=30,
        help_text="페이지당 사용자 수",
    )


class AdminTeamListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="팀 이름 또는 팀장 닉네임 검색어",
    )
    leader_id = serializers.IntegerField(
        required=False,
        min_value=0,
        help_text="팀장 사용자 ID. 0이면 현재 관리자 계정이 팀장인 팀을 조회합니다.",
    )
    page = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
        help_text="조회할 페이지 번호",
    )
    page_size = serializers.IntegerField(
        required=False,
        min_value=1,
        default=30,
        help_text="페이지당 팀 수",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 팀",
            value={
                "id": 1,
                "name": "B201 밴드",
                "color_id": 3,
                "color_value": "#FF6B6B",
                "leader_id": 1,
                "leader_nickname": "홍길동",
                "member_count": 4,
                "updated_at": "2026-05-22",
            },
            response_only=True,
        )
    ]
)
class AdminTeamSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 ID")
    name = serializers.CharField(required=True, help_text="팀 이름")
    color_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="팀 대표 색상 ID. 대표 색상이 없으면 null입니다.",
    )
    color_value = serializers.CharField(
        required=True,
        allow_null=True,
        help_text="팀 대표 색상 HEX 코드. 대표 색상이 없으면 null입니다.",
    )
    leader_id = serializers.IntegerField(required=True, help_text="팀장 사용자 ID")
    leader_nickname = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="팀장 닉네임. 미설정 사용자는 null입니다.",
    )
    member_count = serializers.IntegerField(required=True, help_text="활성 팀 멤버 수")
    updated_at = serializers.DateField(required=True, help_text="팀 정보 마지막 수정일")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 팀 멤버",
            value={
                "id": 2,
                "nickname": "팀원A",
                "email": "member@example.com",
                "status": "normal",
                "is_leader": False,
            },
            response_only=True,
        )
    ]
)
class AdminTeamMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 멤버의 사용자 ID")
    nickname = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="팀 멤버 닉네임. 미설정 사용자는 null입니다.",
    )
    email = serializers.EmailField(
        required=False,
        allow_null=True,
        help_text="팀 멤버 이메일. 제공되지 않으면 null입니다.",
    )
    status = serializers.CharField(
        required=True, help_text="사용자 상태. normal 또는 blocked"
    )
    is_leader = serializers.BooleanField(
        required=True, help_text="해당 멤버가 팀장인지 여부"
    )


class AdminTeamDetailSerializer(AdminTeamSerializer):
    member_ids = serializers.ListField(
        child=serializers.IntegerField(help_text="팀 멤버 사용자 ID"),
        required=True,
        help_text="팀에 속한 멤버 사용자 ID 목록",
    )
    members = AdminTeamMemberSerializer(
        many=True, required=True, help_text="팀 멤버 상세 목록"
    )


class AdminTeamMemberEditListSerializer(serializers.Serializer):
    members = AdminTeamMemberSerializer(
        many=True,
        required=True,
        help_text="현재 팀에 속한 사용자 목록",
    )
    non_members = AdminTeamMemberSerializer(
        many=True,
        required=True,
        help_text="현재 팀에 속하지 않은 사용자 목록",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 팀 생성 요청",
            value={"name": "B201 밴드", "color_id": 3, "leader_id": 0},
            request_only=True,
        )
    ]
)
class AdminTeamCreateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=True, max_length=50, help_text="생성할 팀 이름"
    )
    color_id = serializers.IntegerField(
        required=True,
        min_value=1,
        help_text="팀 대표 색상 ID",
    )
    leader_id = serializers.IntegerField(
        required=True,
        min_value=0,
        help_text="팀장 사용자 ID. 0이면 현재 관리자 계정을 팀장으로 지정합니다.",
    )

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("팀 이름은 비워둘 수 없습니다.")
        return name


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 팀 수정 요청",
            value={"name": "새 팀명", "color_id": 4},
            request_only=True,
        )
    ]
)
class AdminTeamUpdateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=50,
        help_text="변경할 팀 이름. name 또는 color_id 중 하나 이상 필요합니다.",
    )
    color_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="변경할 팀 대표 색상 ID",
    )

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("팀 이름은 비워둘 수 없습니다.")
        return name

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("변경할 값을 입력해주세요.")
        return attrs


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 멤버 추가 요청",
            value={"user_ids": [2, 3]},
            request_only=True,
        )
    ]
)
class AdminTeamMemberAddRequestSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1, help_text="추가할 사용자 ID"),
        allow_empty=False,
        required=True,
        help_text="팀 멤버로 추가할 사용자 ID 목록",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 멤버 편집 요청",
            value={"user_ids": [2, 3]},
            request_only=True,
        )
    ]
)
class AdminTeamMemberUpdateRequestSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1, help_text="최종 팀 멤버 사용자 ID"),
        required=True,
        help_text="편집 후 팀에 남길 사용자 ID 목록. 요청자 본인은 제외해도 기존 멤버 상태가 유지됩니다.",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀장 변경 요청",
            value={"leader_id": 2},
            request_only=True,
        )
    ]
)
class AdminTeamLeaderRequestSerializer(serializers.Serializer):
    leader_id = serializers.IntegerField(
        required=True,
        min_value=0,
        help_text="새 팀장 사용자 ID. 0이면 현재 관리자 계정을 팀장으로 지정합니다.",
    )


class AdminTeamColorQuerySerializer(serializers.Serializer):
    team_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="팀 수정 시 현재 팀 색상을 사용 가능으로 표시하기 위한 팀 ID",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 팀 색상",
            value={"id": 3, "name": "Coral", "value": "#FF6B6B", "available": True},
            response_only=True,
        )
    ]
)
class AdminTeamColorSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 색상 ID")
    name = serializers.CharField(required=True, help_text="팀 색상 이름")
    value = serializers.CharField(required=True, help_text="팀 색상 HEX 코드")
    available = serializers.BooleanField(
        required=True, help_text="현재 선택 가능한 색상인지 여부"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 합주실",
            value={
                "id": 1,
                "name": "A룸",
                "description": "큰 방",
                "open_time": "09:00:00",
                "close_time": "23:00:00",
                "is_open_all_day": False,
                "is_active": True,
                "sort_order": 1,
                "updated_at": "2026-05-22",
            },
            response_only=True,
        )
    ]
)
class AdminRoomSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="합주실 ID")
    name = serializers.CharField(required=True, help_text="합주실 이름")
    description = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="합주실 설명. 없으면 null입니다.",
    )
    open_time = serializers.TimeField(required=True, help_text="합주실 운영 시작 시간")
    close_time = serializers.TimeField(required=True, help_text="합주실 운영 종료 시간")
    is_open_all_day = serializers.BooleanField(
        required=True, help_text="24시간 운영 여부"
    )
    is_active = serializers.BooleanField(required=True, help_text="합주실 활성 상태")
    sort_order = serializers.IntegerField(
        required=True, help_text="관리자 화면 표시 순서"
    )
    updated_at = serializers.DateField(
        required=True, help_text="합주실 정보 마지막 수정일"
    )


class AdminRoomListQuerySerializer(serializers.Serializer):
    include_inactive = serializers.BooleanField(
        required=False,
        default=False,
        help_text="비활성 합주실도 목록에 포함할지 여부",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "합주실 생성/수정 요청",
            value={
                "name": "A룸",
                "description": "큰 방",
                "open_time": "09:00:00",
                "close_time": "23:00:00",
                "is_open_all_day": False,
            },
            request_only=True,
        )
    ]
)
class AdminRoomRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, max_length=30, help_text="합주실 이름")
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
        help_text="합주실 설명. 입력하지 않거나 null일 수 있습니다.",
    )
    open_time = serializers.TimeField(required=True, help_text="합주실 운영 시작 시간")
    close_time = serializers.TimeField(required=True, help_text="합주실 운영 종료 시간")
    is_open_all_day = serializers.BooleanField(
        required=True, help_text="24시간 운영 여부"
    )

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("합주실 이름은 비워둘 수 없습니다.")
        return name


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 예약",
            value={
                "id": 10,
                "status": "approved",
                "kind": "single",
                "room_id": 1,
                "room_name": "A룸",
                "date": "2026-05-22",
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "end_next_day": False,
                "team_id": 1,
                "team_name": "B201 밴드",
                "reserver_user_id": 2,
                "name": "B201 밴드",
                "reserver_name": "홍길동",
                "memo": "합주",
                "repeat_weekdays": None,
                "repeat_start_date": None,
                "repeat_end_date": None,
                "canceled_occurrence_dates": [],
            },
            response_only=True,
        )
    ]
)
class AdminReservationSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="예약 ID")
    status = serializers.CharField(
        required=True, help_text="예약 상태. pending 또는 approved"
    )
    kind = serializers.CharField(
        required=True, help_text="예약 종류. single 또는 repeat"
    )
    room_id = serializers.IntegerField(required=True, help_text="예약된 합주실 ID")
    room_name = serializers.CharField(required=True, help_text="예약된 합주실 이름")
    date = serializers.DateField(required=True, help_text="예약 날짜")
    start_time = serializers.TimeField(required=True, help_text="예약 시작 시간")
    end_time = serializers.TimeField(required=True, help_text="예약 종료 시간")
    end_next_day = serializers.BooleanField(
        required=True, help_text="예약 종료 시간이 다음날인지 여부"
    )
    team_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="팀 예약의 팀 ID. 개인 예약이면 null입니다.",
    )
    team_name = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="팀 예약의 팀 이름. 개인 예약이면 null입니다.",
    )
    reserver_user_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="예약자 사용자 ID. 관리자 직접 예약 등에서는 null일 수 있습니다.",
    )
    name = serializers.CharField(
        required=True, help_text="관리자 화면에 표시할 예약 이름"
    )
    reserver_name = serializers.CharField(required=True, help_text="예약자 표시 이름")
    memo = serializers.CharField(
        required=False, allow_blank=True, help_text="예약 메모"
    )
    repeat_weekdays = serializers.ListField(
        child=serializers.IntegerField(help_text="반복 요일 값"),
        required=False,
        allow_null=True,
        help_text="반복 예약 요일 목록. 단건 예약이면 null입니다.",
    )
    repeat_start_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="반복 예약 시작일. 단건 예약이면 null입니다.",
    )
    repeat_end_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="반복 예약 종료일. 단건 예약이면 null입니다.",
    )
    canceled_occurrence_dates = serializers.ListField(
        child=serializers.DateField(help_text="취소된 반복 예약 회차 날짜"),
        required=False,
        help_text="반복 예약 중 취소된 회차 날짜 목록",
    )
    canceled_at = serializers.DateTimeField(required=False, allow_null=True)
    canceled_by = serializers.IntegerField(required=False, allow_null=True)
    canceled_by_name = serializers.CharField(required=False, allow_null=True)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 예약 생성 요청",
            value={
                "date": "2026-05-22",
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "end_next_day": False,
                "room_id": 1,
                "team_id": 1,
                "title": "관리자 예약",
                "memo": "전화 예약",
                "force_cancel_conflict_ids": [9],
            },
            request_only=True,
        )
    ]
)
class AdminReservationCreateRequestSerializer(serializers.Serializer):
    date = serializers.DateField(
        required=True, format="%Y-%m-%d", help_text="예약 날짜"
    )
    start_time = serializers.TimeField(required=True, help_text="예약 시작 시간")
    end_time = serializers.TimeField(required=True, help_text="예약 종료 시간")
    end_next_day = serializers.BooleanField(
        required=False,
        default=False,
        help_text="예약 종료 시간이 다음날인지 여부",
    )
    room_id = serializers.IntegerField(
        required=True, min_value=1, help_text="예약할 합주실 ID"
    )
    team_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        help_text="팀 예약으로 생성할 팀 ID. 생략하거나 null이면 관리자 개인 예약입니다.",
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
        help_text="관리자 개인 예약 표시 제목",
    )
    memo = serializers.CharField(
        required=False, allow_blank=True, help_text="예약 메모"
    )
    force_cancel_conflict_ids = serializers.ListField(
        child=serializers.IntegerField(
            min_value=1, help_text="강제 취소할 충돌 예약 ID"
        ),
        required=False,
        default=list,
        help_text="예약 생성 전 충돌 예약을 강제 취소할 때 전달하는 예약 ID 목록",
    )

    def validate_date(self, value):
        return validate_not_past_reservation_date(value)


class AdminReservationListQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        required=True,
        choices=["pending", "approved"],
        help_text="조회할 예약 상태. pending 또는 approved",
    )
    date_range = serializers.IntegerField(
        required=False,
        min_value=0,
        default=7,
        help_text="승인 예약 조회 시 오늘부터 몇 일 범위를 조회할지 지정합니다.",
    )
    team_type = serializers.ChoiceField(
        required=False,
        choices=["all", "team", "private"],
        default="all",
        help_text="예약 유형 필터. all, team, private 중 하나",
    )
    room_id = serializers.IntegerField(
        required=False, min_value=1, help_text="합주실 ID 필터"
    )
    page = serializers.IntegerField(
        required=False, min_value=1, default=1, help_text="조회할 페이지 번호"
    )
    page_size = serializers.IntegerField(
        required=False, min_value=1, default=20, help_text="페이지당 예약 수"
    )


class AdminReservationConflictQuerySerializer(serializers.Serializer):
    room_id = serializers.IntegerField(
        required=True, min_value=1, help_text="충돌을 확인할 합주실 ID"
    )
    date = serializers.DateField(
        required=True, format="%Y-%m-%d", help_text="충돌을 확인할 날짜"
    )
    start_time = serializers.TimeField(
        required=True, help_text="충돌을 확인할 시작 시간"
    )
    end_time = serializers.TimeField(required=True, help_text="충돌을 확인할 종료 시간")
    end_next_day = serializers.BooleanField(
        required=False,
        default=False,
        help_text="종료 시간이 다음날인지 여부",
    )
    exclude_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="예약 수정 시 충돌 검사에서 제외할 예약 ID",
    )

    def validate_date(self, value):
        return validate_not_past_reservation_date(value)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "예약 충돌 항목",
            value={
                "id": 9,
                "room_id": 1,
                "room_name": "A룸",
                "date": "2026-05-22",
                "start_time": "10:30:00",
                "end_time": "11:30:00",
                "end_next_day": False,
                "owner_label": "B201 밴드",
                "status": "approved",
            },
            response_only=True,
        )
    ]
)
class AdminReservationConflictSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="충돌 예약 ID")
    room_id = serializers.IntegerField(
        required=False, help_text="충돌 예약의 합주실 ID"
    )
    room_name = serializers.CharField(
        required=True, help_text="충돌 예약의 합주실 이름"
    )
    date = serializers.DateField(required=True, help_text="충돌 예약 날짜")
    start_time = serializers.TimeField(required=True, help_text="충돌 예약 시작 시간")
    end_time = serializers.TimeField(required=True, help_text="충돌 예약 종료 시간")
    end_next_day = serializers.BooleanField(
        required=True, help_text="충돌 예약 종료 시간이 다음날인지 여부"
    )
    owner_label = serializers.CharField(
        required=True, help_text="충돌 예약 소유자 표시 이름"
    )
    status = serializers.CharField(required=True, help_text="충돌 예약 상태")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "반복 예약 회차 취소 요청",
            value={"dates": ["2026-05-22", "2026-05-29"]},
            request_only=True,
        )
    ]
)
class AdminReservationCancelOccurrencesRequestSerializer(serializers.Serializer):
    dates = serializers.ListField(
        child=serializers.DateField(
            format="%Y-%m-%d", help_text="취소할 반복 예약 회차 날짜"
        ),
        allow_empty=False,
        required=True,
        help_text="취소할 반복 예약 회차 날짜 목록",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "반복 예약 회차 취소 응답",
            value={"canceled_occurrence_dates": ["2026-05-22", "2026-05-29"]},
            response_only=True,
        )
    ]
)
class AdminReservationCancelOccurrencesSerializer(serializers.Serializer):
    canceled_occurrence_dates = serializers.ListField(
        child=serializers.DateField(
            format="%Y-%m-%d", help_text="취소된 반복 예약 회차 날짜"
        ),
        required=True,
        help_text="취소 처리된 반복 예약 회차 날짜 목록",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 쉬는날",
            value={
                "id": 1,
                "room_id": 1,
                "room_name": "A룸",
                "type": "휴무",
                "start_date": "2026-05-22",
                "end_date": "2026-05-22",
                "start_time": None,
                "end_time": None,
                "is_all_day": True,
                "reason": "정기 휴무",
                "created_at": "2026-05-22T09:00:00Z",
            },
            response_only=True,
        )
    ]
)
class AdminDayOffSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="쉬는날 ID")
    room_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="쉬는날 대상 합주실 ID. 전체 합주실 대상이면 null입니다.",
    )
    room_name = serializers.CharField(
        required=True, help_text="쉬는날 대상 합주실 이름 또는 전체 표시 이름"
    )
    type = serializers.CharField(
        required=True, help_text="쉬는날 유형. 점검, 휴무, 기타"
    )
    start_date = serializers.DateField(required=True, help_text="쉬는날 시작일")
    end_date = serializers.DateField(required=True, help_text="쉬는날 종료일")
    start_time = serializers.TimeField(
        required=False,
        allow_null=True,
        help_text="부분 쉬는날 시작 시간. 종일이면 null입니다.",
    )
    end_time = serializers.TimeField(
        required=False,
        allow_null=True,
        help_text="부분 쉬는날 종료 시간. 종일이면 null입니다.",
    )
    is_all_day = serializers.BooleanField(required=True, help_text="종일 쉬는날 여부")
    reason = serializers.CharField(
        required=False, allow_null=True, help_text="쉬는날 사유"
    )
    created_at = serializers.DateTimeField(required=True, help_text="쉬는날 등록 시각")


class AdminDayOffListQuerySerializer(serializers.Serializer):
    room_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="특정 합주실 쉬는날만 조회할 때 사용하는 합주실 ID",
    )
    page = serializers.IntegerField(
        required=False, min_value=1, default=1, help_text="조회할 페이지 번호"
    )
    page_size = serializers.IntegerField(
        required=False, min_value=1, default=30, help_text="페이지당 쉬는날 수"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "쉬는날 생성/충돌 확인 요청",
            value={
                "room_id": 1,
                "type": "휴무",
                "start_date": "2026-05-22",
                "end_date": "2026-05-22",
                "start_time": None,
                "end_time": None,
                "is_all_day": True,
                "reason": "정기 휴무",
                "force_cancel_reservation_ids": [10],
            },
            request_only=True,
        )
    ]
)
class AdminDayOffRequestSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        help_text="쉬는날 대상 합주실 ID. 생략하거나 null이면 전체 합주실 대상입니다.",
    )
    type = serializers.ChoiceField(
        required=True,
        choices=["점검", "휴무", "기타"],
        help_text="쉬는날 유형. 점검, 휴무, 기타 중 하나",
    )
    start_date = serializers.DateField(
        required=True, format="%Y-%m-%d", help_text="쉬는날 시작일"
    )
    end_date = serializers.DateField(
        required=True, format="%Y-%m-%d", help_text="쉬는날 종료일"
    )
    start_time = serializers.TimeField(
        required=False,
        allow_null=True,
        help_text="부분 쉬는날 시작 시간. 종일이면 null입니다.",
    )
    end_time = serializers.TimeField(
        required=False,
        allow_null=True,
        help_text="부분 쉬는날 종료 시간. 종일이면 null입니다.",
    )
    is_all_day = serializers.BooleanField(required=True, help_text="종일 쉬는날 여부")
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="쉬는날 사유",
    )
    force_cancel_reservation_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1, help_text="강제 취소할 예약 ID"),
        required=False,
        default=list,
        help_text="쉬는날 생성 전 충돌 예약을 강제 취소할 때 전달하는 예약 ID 목록",
    )


class AdminLogQuerySerializer(serializers.Serializer):
    category = serializers.ChoiceField(
        required=False,
        choices=["예약", "사용자", "팀", "합주실", "쉬는날"],
        help_text="관리자 액션 로그 카테고리 필터",
    )
    created_after = serializers.DateTimeField(
        required=False,
        help_text="이 시각 이후 생성된 로그만 조회합니다.",
    )
    cursor = serializers.CharField(required=False, help_text="다음 페이지 조회용 커서")
    page_size = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100,
        default=30,
        help_text="페이지당 로그 수",
    )

    def validate_cursor(self, value):
        try:
            raw_cursor = base64.b64decode(value.encode()).decode()
            created_at_value, id_value = raw_cursor.rsplit("__", 1)
            datetime.fromisoformat(created_at_value)
            int(id_value)
        except (binascii.Error, UnicodeDecodeError, ValueError):
            raise serializers.ValidationError("유효하지 않은 cursor입니다.")
        return value


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "관리자 로그",
            value={
                "id": 1,
                "category": "예약",
                "action": "예약 승인",
                "target": "예약 #10",
                "detail": "예약을 승인했습니다.",
                "created_at": "2026-05-22T09:00:00Z",
            },
            response_only=True,
        )
    ]
)
class AdminLogSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="관리자 액션 로그 ID")
    category = serializers.CharField(required=True, help_text="로그 카테고리")
    action = serializers.CharField(required=True, help_text="관리자가 수행한 액션 이름")
    target = serializers.CharField(required=True, help_text="액션 대상 표시 이름")
    detail = serializers.CharField(required=True, help_text="액션 상세 설명")
    created_at = serializers.DateTimeField(required=True, help_text="로그 생성 시각")


class AdminPagePaginationSerializer(serializers.Serializer):
    page = serializers.IntegerField(required=True, help_text="현재 페이지 번호")
    page_size = serializers.IntegerField(required=True, help_text="페이지당 항목 수")
    total_count = serializers.IntegerField(required=True, help_text="전체 항목 수")
    total_pages = serializers.IntegerField(required=True, help_text="전체 페이지 수")


class AdminCursorPaginationSerializer(serializers.Serializer):
    next_cursor = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="다음 페이지 조회에 사용할 커서. 다음 페이지가 없으면 null입니다.",
    )
    has_next = serializers.BooleanField(
        required=True, help_text="다음 페이지 존재 여부"
    )
    page_size = serializers.IntegerField(required=True, help_text="페이지당 항목 수")


class AdminBusinessErrorSerializer(serializers.Serializer):
    ok = serializers.BooleanField(
        required=True, help_text="비즈니스 요청 성공 여부. 오류 응답에서는 false"
    )
    error_code = serializers.CharField(
        required=True, help_text="클라이언트가 분기할 수 있는 오류 코드"
    )
    message = serializers.CharField(
        required=True, help_text="사용자 또는 개발자에게 표시할 오류 메시지"
    )
    data = serializers.JSONField(
        required=False, help_text="오류와 함께 전달되는 추가 데이터"
    )


class AdminEmptySuccessSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")


class AdminMeSerializer(serializers.Serializer):
    is_staff = serializers.BooleanField(required=True, help_text="관리자 권한 여부")


class AdminMeResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminMeSerializer(required=True, help_text="현재 사용자 관리자 권한 정보")


class AdminUserListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminUserSerializer(many=True, help_text="사용자 목록")
    pagination = AdminPagePaginationSerializer(
        required=True, help_text="페이지네이션 정보"
    )


class AdminUserResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminUserSerializer(required=True, help_text="사용자 상세 정보")


class AdminTeamColorListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminTeamColorSerializer(many=True, help_text="팀 색상 목록")


class AdminTeamListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminTeamSerializer(many=True, help_text="팀 목록")
    pagination = AdminPagePaginationSerializer(
        required=True, help_text="페이지네이션 정보"
    )


class AdminTeamDetailResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminTeamDetailSerializer(required=True, help_text="팀 상세 정보")


class AdminTeamMemberEditListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminTeamMemberEditListSerializer(
        required=True, help_text="팀 멤버 편집용 사용자 목록"
    )


class AdminTeamMemberAddDataSerializer(serializers.Serializer):
    added_user_ids = serializers.ListField(
        child=serializers.IntegerField(help_text="추가된 사용자 ID"),
        help_text="이번 요청으로 새로 추가된 사용자 ID 목록",
    )
    member_ids = serializers.ListField(
        child=serializers.IntegerField(help_text="현재 팀 멤버 사용자 ID"),
        help_text="추가 후 현재 팀 멤버 사용자 ID 목록",
    )


class AdminTeamMemberAddResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminTeamMemberAddDataSerializer(
        required=True, help_text="팀 멤버 추가 결과"
    )


class AdminTeamLeaderDataSerializer(serializers.Serializer):
    leader_id = serializers.IntegerField(
        required=True, help_text="변경된 팀장 사용자 ID"
    )
    leader_nickname = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="변경된 팀장 닉네임. 미설정 사용자는 null입니다.",
    )


class AdminTeamLeaderResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminTeamLeaderDataSerializer(required=True, help_text="팀장 변경 결과")


class AdminRoomListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminRoomSerializer(many=True, help_text="합주실 목록")


class AdminRoomResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminRoomSerializer(required=True, help_text="합주실 상세 정보")


class AdminReservationListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminReservationSerializer(many=True, help_text="예약 목록")
    pagination = AdminPagePaginationSerializer(
        required=True, help_text="페이지네이션 정보"
    )


class AdminReservationResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminReservationSerializer(required=True, help_text="예약 상세 정보")


class AdminReservationConflictListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminReservationConflictSerializer(many=True, help_text="충돌 예약 목록")


class AdminReservationCancelOccurrencesResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminReservationCancelOccurrencesSerializer(
        required=True, help_text="반복 예약 회차 취소 결과"
    )


class AdminDayOffListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminDayOffSerializer(many=True, help_text="쉬는날 목록")
    pagination = AdminPagePaginationSerializer(
        required=True, help_text="페이지네이션 정보"
    )


class AdminDayOffResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminDayOffSerializer(required=True, help_text="쉬는날 상세 정보")


class AdminLogListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField(required=True, help_text="요청 성공 여부")
    data = AdminLogSerializer(many=True, help_text="관리자 액션 로그 목록")
    pagination = AdminCursorPaginationSerializer(
        required=True, help_text="커서 페이지네이션 정보"
    )
