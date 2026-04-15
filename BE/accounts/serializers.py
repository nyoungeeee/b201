import re

from rest_framework import serializers


class UserInfoSerializer(serializers.Serializer):
    class TeamSerializer(serializers.Serializer):
        id = serializers.IntegerField(required=True)
        name = serializers.CharField(required=True)

    id = serializers.IntegerField(required=True)
    nickname = serializers.CharField(allow_null=True)
    team = TeamSerializer(many=True, required=True)


class PatchUserInfoRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(required=True)

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
