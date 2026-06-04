from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from django.conf import settings
from rest_framework import serializers


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "토큰 응답",
            value={
                "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access",
                "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
            },
            response_only=True,
        )
    ]
)
class TokenStatusSerializer(serializers.Serializer):
    access = serializers.CharField(help_text="API 인증에 사용하는 JWT access token")
    refresh = serializers.CharField(
        help_text="access token 재발급에 사용하는 JWT refresh token"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "로그인 응답",
            value={
                "id": 1,
                "email": "member@example.com",
                "nickname": "홍길동",
                "team": [{"id": 1, "name": "B201 밴드", "color": "#FF6B6B"}],
                "token": {
                    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access",
                    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
                },
            },
            response_only=True,
        )
    ]
)
class SigninResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="로그인한 사용자 ID")
    email = serializers.EmailField(
        required=False,
        allow_null=True,
        help_text="카카오 계정 이메일. 제공되지 않으면 null입니다.",
    )
    nickname = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="서비스 닉네임. 신규 사용자는 null로 반환될 수 있습니다.",
    )
    team = serializers.ListField(
        child=serializers.DictField(help_text="소속 팀 요약 정보"),
        help_text="사용자가 소속된 팀 목록",
    )
    token = TokenStatusSerializer(help_text="로그인 성공 시 발급된 JWT 토큰 세트")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "카카오 로그인 요청",
            value={
                "kakao_auth_code": "kakao-authorization-code",
                "redirect_uri": "https://b201.kr/auth/kakao/callback",
            },
            request_only=True,
        )
    ]
)
class SigninRequestSerializer(serializers.Serializer):
    kakao_auth_code = serializers.CharField(
        required=True,
        help_text="카카오 OAuth 인가 코드",
    )
    redirect_uri = serializers.URLField(
        required=True,
        help_text="카카오 인가 요청에 사용한 callback URI",
    )

    def validate_redirect_uri(self, value):
        if value not in settings.KAKAO_REDIRECT_URIS:
            raise serializers.ValidationError("허용되지 않은 redirect URI입니다.")

        return value


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "토큰 재발급 요청",
            value={"refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh"},
            request_only=True,
        )
    ]
)
class TokenRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        required=True, help_text="재발급에 사용할 refresh token"
    )
