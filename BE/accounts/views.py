import logging

from rest_framework import serializers, status
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.exceptions import NicknameAlreadyExistsError, UserNotFoundError
from accounts.services import UserInfoService
from common.api_exceptions import (
    ConflictException,
    ForbiddenException,
)
from common.service_exceptions import BaseServiceError
from common.swagger import openapi_exception_response

logger = logging.getLogger(__name__)


class UserInfoSerializer(serializers.Serializer):
    class TeamSerializer(serializers.Serializer):
        id = serializers.IntegerField(required=True)
        name = serializers.CharField(required=True)

    id = serializers.IntegerField(required=True)
    nickname = serializers.CharField(allow_null=True)
    team = TeamSerializer(many=True, required=True)


class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=UserInfoSerializer,
                description="사용자 정보 조회 성공",
            ),
            403: openapi_exception_response(UserNotFoundError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="인증된 사용자의 정보 조회",
    )
    def get(self, request):
        user = request.user
        try:
            user_info = UserInfoService.get_user_info(user)
        except UserNotFoundError as e:
            raise ForbiddenException(code=e.code, message=e.message)
        return Response(UserInfoSerializer(user_info).data, status=status.HTTP_200_OK)

    class PatchUserInfoRequestSerializer(serializers.Serializer):
        nickname = serializers.CharField(required=True)

    @extend_schema(
        request=PatchUserInfoRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=UserInfoSerializer,
                description="사용자 정보 수정 성공",
            ),
            403: openapi_exception_response(UserNotFoundError),
            409: openapi_exception_response(NicknameAlreadyExistsError),
            500: openapi_exception_response(BaseServiceError),
        },
        description="인증된 사용자의 닉네임 수정",
    )
    def patch(self, request):
        user = request.user
        serializer = self.PatchUserInfoRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nickname = serializer.validated_data["nickname"]
        try:
            user_info = UserInfoService.patch_user_info(user, nickname)
        except UserNotFoundError as e:
            raise ForbiddenException(code=e.code, message=e.message)
        except NicknameAlreadyExistsError as e:
            raise ConflictException(code=e.code, message=e.message)
        return Response(UserInfoSerializer(user_info).data, status=status.HTTP_200_OK)
