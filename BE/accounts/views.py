import logging

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
from accounts.serializers import (
    CheckNicknameResponseSerializer,
    PatchUserInfoRequestSerializer,
    UserInfoSerializer,
)
from rest_framework import status

logger = logging.getLogger(__name__)


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
        serializer = PatchUserInfoRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nickname = serializer.validated_data["nickname"]
        try:
            user_info = UserInfoService.patch_user_info(user, nickname)
        except UserNotFoundError as e:
            raise ForbiddenException(code=e.code, message=e.message)
        except NicknameAlreadyExistsError as e:
            raise ConflictException(code=e.code, message=e.message)
        return Response(UserInfoSerializer(user_info).data, status=status.HTTP_200_OK)

class UserNicknameCheckView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[PatchUserInfoRequestSerializer],
        responses={
            200: OpenApiResponse(
                response=CheckNicknameResponseSerializer,
                description="닉네임 사용 가능",
            ),
            500: openapi_exception_response(BaseServiceError),
        },
        description="닉네임 중복 체크",
    )
    def get(self, request):
        serializer = PatchUserInfoRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        nickname = serializer.validated_data["nickname"]
        available = not UserInfoService.check_nickname_availability(nickname)
        return Response(
            CheckNicknameResponseSerializer({"available": available}).data,
            status=status.HTTP_200_OK,
        )
