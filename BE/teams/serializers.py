import re

from rest_framework import serializers


class TeamMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    nickname = serializers.CharField(required=False, allow_null=True)
    role = serializers.CharField(required=True)


class TeamMemberListSerializer(serializers.Serializer):
    members = TeamMemberSerializer(many=True, required=True)


class TeamMemberAddRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(required=True)

    def validate_nickname(self, value: str) -> str:
        nickname = value.strip()
        if not nickname:
            raise serializers.ValidationError("닉네임은 필수 입력값입니다.")
        return nickname


class TeamMemberRemoveRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True, min_value=1)


class TeamConfigRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=50)
    color = serializers.CharField(required=False, max_length=7)

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("팀 이름은 비워둘 수 없습니다.")
        return name

    def validate_color(self, value: str) -> str:
        color = value.strip().lstrip("#")
        if not re.fullmatch(r"[0-9A-Fa-f]{6}", color):
            raise serializers.ValidationError(
                "대표 색상은 6자리 HEX 형식이어야 합니다."
            )
        return color.upper()

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "변경할 팀 이름 또는 대표 색상을 입력해주세요."
            )
        return attrs


class TeamConfigSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    name = serializers.CharField(required=True)
    color = serializers.CharField(required=True)


class TeamColorSerializer(serializers.Serializer):
    color = serializers.CharField(required=True)
    available = serializers.BooleanField(required=True)


class TeamColorListSerializer(serializers.Serializer):
    colors = TeamColorSerializer(many=True, required=True)
