from rest_framework import serializers


class TestSigninRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(required=True)
    is_staff = serializers.BooleanField(required=False, default=False)
