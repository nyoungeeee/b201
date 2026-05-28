from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 멤버",
            value={"id": 2, "nickname": "팀원A", "role": "member"},
            response_only=True,
        )
    ]
)
class TeamMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 멤버의 사용자 ID")
    nickname = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="팀 멤버 닉네임. 탈퇴 또는 미설정 사용자는 null일 수 있습니다.",
    )
    role = serializers.CharField(
        required=True, help_text="팀 내 역할. leader 또는 member"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 멤버 목록",
            value={"members": [{"id": 2, "nickname": "팀원A", "role": "member"}]},
            response_only=True,
        )
    ]
)
class TeamMemberListSerializer(serializers.Serializer):
    members = TeamMemberSerializer(many=True, required=True, help_text="팀 멤버 목록")


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 멤버 추가 요청",
            value={"nickname": "새멤버"},
            request_only=True,
        )
    ]
)
class TeamMemberAddRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(
        required=True,
        help_text="팀에 추가할 사용자의 닉네임",
    )

    def validate_nickname(self, value: str) -> str:
        nickname = value.strip()
        if not nickname:
            raise serializers.ValidationError("닉네임은 필수 입력값입니다.")
        return nickname


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 멤버 제거/팀장 위임 요청",
            value={"user_id": 2},
            request_only=True,
        )
    ]
)
class TeamMemberRemoveRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(
        required=True,
        min_value=1,
        help_text="제거하거나 팀장으로 위임할 사용자 ID",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 설정 수정 요청",
            value={"name": "새 팀명", "color_id": 3},
            request_only=True,
        )
    ]
)
class TeamConfigRequestSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=50,
        help_text="변경할 팀 이름. name 또는 color_id 중 하나 이상 필요합니다.",
    )
    color_id = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="변경할 팀 대표 색상 ID. 등록된 사용 가능 색상만 선택할 수 있습니다.",
    )

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("팀 이름은 비워둘 수 없습니다.")
        return name

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "변경할 팀 이름 또는 대표 색상을 입력해주세요."
            )
        return attrs


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 설정 응답",
            value={"id": 1, "name": "B201 밴드", "color_id": 3, "color": "#FF6B6B"},
            response_only=True,
        )
    ]
)
class TeamConfigSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 ID")
    name = serializers.CharField(required=True, help_text="팀 이름")
    color_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="팀 대표 색상 ID. 색상이 없으면 null입니다.",
    )
    color = serializers.CharField(
        required=True,
        allow_null=True,
        help_text="팀 대표 색상 HEX 코드. 색상이 없으면 null입니다.",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 색상",
            value={"id": 3, "color": "#FF6B6B", "available": True},
            response_only=True,
        )
    ]
)
class TeamColorSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 색상 ID")
    color = serializers.CharField(required=True, help_text="팀 색상 HEX 코드")
    available = serializers.BooleanField(
        required=True,
        help_text="현재 사용자가 선택 가능한 색상인지 여부",
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 색상 목록",
            value={"colors": [{"id": 3, "color": "#FF6B6B", "available": True}]},
            response_only=True,
        )
    ]
)
class TeamColorListSerializer(serializers.Serializer):
    colors = TeamColorSerializer(
        many=True, required=True, help_text="등록된 팀 색상 목록"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "팀 상세",
            value={
                "id": 1,
                "name": "B201 밴드",
                "color_id": 3,
                "color": "#FF6B6B",
                "members": [{"id": 2, "nickname": "팀원A", "role": "member"}],
                "is_leader": True,
            },
            response_only=True,
        )
    ]
)
class TeamDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True, help_text="팀 ID")
    name = serializers.CharField(required=True, help_text="팀 이름")
    color_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="팀 대표 색상 ID. 색상이 없으면 null입니다.",
    )
    color = serializers.CharField(
        required=True,
        allow_null=True,
        help_text="팀 대표 색상 HEX 코드. 색상이 없으면 null입니다.",
    )
    members = TeamMemberSerializer(many=True, required=True, help_text="팀 멤버 목록")
    is_leader = serializers.BooleanField(
        required=True,
        help_text="요청한 사용자가 해당 팀의 팀장인지 여부",
    )
