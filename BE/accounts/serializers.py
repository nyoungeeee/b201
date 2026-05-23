import re

from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "내 정보 응답",
            value={
                "id": 1,
                "email": "member@example.com",
                "nickname": "홍길동",
                "team": [{"id": 1, "name": "B201 밴드", "color": "#FF6B6B"}],
            },
            response_only=True,
        )
    ]
)
class UserInfoSerializer(serializers.Serializer):
    class TeamSerializer(serializers.Serializer):
        id = serializers.IntegerField(
            required=True, help_text="사용자가 소속된 팀의 ID"
        )
        name = serializers.CharField(required=True, help_text="사용자가 소속된 팀 이름")
        color = serializers.CharField(required=True, help_text="팀 대표 색상 HEX 코드")

    id = serializers.IntegerField(required=True, help_text="사용자 ID")
    email = serializers.EmailField(
        required=False,
        allow_null=True,
        help_text="카카오 계정 이메일. 제공되지 않으면 null입니다.",
    )
    nickname = serializers.CharField(
        allow_null=True,
        help_text="서비스에서 사용하는 닉네임. 신규 가입 직후에는 null일 수 있습니다.",
    )
    team = TeamSerializer(
        many=True,
        required=True,
        help_text="사용자가 현재 소속된 팀 목록",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "닉네임 수정/확인 요청",
            value={"nickname": "홍길동"},
            request_only=True,
        )
    ]
)
class PatchUserInfoRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(
        required=True,
        help_text="변경하거나 중복 확인할 닉네임. 한글, 영문, 숫자만 사용할 수 있습니다.",
    )

    def validate_nickname(self, value: str) -> str:
        if value is None:
            raise serializers.ValidationError("닉네임은 필수 입력값입니다.")

        nickname = value.strip()
        if not nickname:
            raise serializers.ValidationError("닉네임은 필수 입력값입니다.")

        if not re.fullmatch(r"[A-Za-z0-9가-힣]+", nickname):
            raise serializers.ValidationError(
                "닉네임은 한글, 영문, 숫자만 사용할 수 있습니다."
            )

        display_length = 0
        for char in nickname:
            if re.fullmatch(r"[가-힣]", char):
                display_length += 2
            else:
                display_length += 1

        if display_length > 16:
            raise serializers.ValidationError(
                "닉네임은 한글 최대 8자, 영문/숫자 최대 16자까지 입력할 수 있습니다."
            )

        return nickname


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "닉네임 사용 가능 응답",
            value={"available": True},
            response_only=True,
        )
    ]
)
class CheckNicknameResponseSerializer(serializers.Serializer):
    available = serializers.BooleanField(
        required=True,
        help_text="닉네임 사용 가능 여부. true이면 사용할 수 있습니다.",
    )
