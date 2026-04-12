from rest_framework import serializers


class TokenStatusSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class SigninResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    nickname = serializers.CharField(required=False, allow_null=True)
    team = serializers.ListField(
        child=serializers.DictField(),
    )
    token = TokenStatusSerializer()


class SigninRequestSerializer(serializers.Serializer):
    kakao_auth_code = serializers.CharField(required=True)


class TokenRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)
