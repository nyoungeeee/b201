from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "테스트 로그인 요청",
            value={"nickname": "테스터", "is_staff": False},
            request_only=True,
        )
    ]
)
class TestSigninRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(
        required=True,
        help_text="테스트 로그인에 사용할 닉네임. 없으면 테스트 사용자를 생성합니다.",
    )
    is_staff = serializers.BooleanField(
        required=False,
        default=False,
        help_text="테스트 사용자에게 관리자 권한을 부여할지 여부",
    )
