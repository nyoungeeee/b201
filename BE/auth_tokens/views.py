import logging

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.service_exceptions import BaseServiceError
from common.swagger import openapi_exception_response
from common.api_exceptions import (
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
)


from .exceptions import (
    InvalidOrExpiredTokenError,
    KakaoAPIError,
    UserBlockedError,
    UserNotFoundError,
)
from .serializers import (
    SigninRequestSerializer,
    SigninResponseSerializer,
    TokenRefreshRequestSerializer,
    TokenStatusSerializer,
)
from .services import AuthService, TokenRefreshService

logger = logging.getLogger(__name__)


class SigninView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=SigninRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=SigninResponseSerializer,
                description="기존 사용자 로그인 성공",
            ),
            201: OpenApiResponse(
                response=SigninResponseSerializer,
                description="신규 사용자 생성 및 로그인 성공 \n신규 사용자 생성 시 nickname은 null로 반환. 사용자 정보 수정 API를 통해 nickname을 입력받아야 함",
            ),
            400: openapi_exception_response(UserNotFoundError),
            403: openapi_exception_response(UserBlockedError),
            500: openapi_exception_response(BaseServiceError, KakaoAPIError),
        },
        description="사용자 로그인 및 토큰 발급",
    )
    def post(self, request):
        serializer = SigninRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            signin_response, new_user_created = AuthService.signin(
                kakao_auth_code=serializer.validated_data["kakao_auth_code"],
            )

        except UserNotFoundError as e:
            raise BadRequestException(code=e.code, message=e.message)
        except UserBlockedError as e:
            raise ForbiddenException(code=e.code, message=e.message)
        except KakaoAPIError as e:
            raise InternalServerErrorException(code=e.code, message=e.message)

        if new_user_created:
            return Response(
                SigninResponseSerializer(signin_response).data,
                status=status.HTTP_201_CREATED,
            )

        else:
            return Response(
                SigninResponseSerializer(signin_response).data,
                status=status.HTTP_200_OK,
            )


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=TokenRefreshRequestSerializer,
        responses={
            200: TokenStatusSerializer,
            400: openapi_exception_response(InvalidOrExpiredTokenError),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def post(self, request):
        serializer = TokenRefreshRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token_status = TokenRefreshService.refresh_tokens(
                refresh_token_str=serializer.validated_data["refresh"],
            )

        except InvalidOrExpiredTokenError as e:
            raise BadRequestException(code=e.code, message=e.message)

        return Response(
            TokenStatusSerializer(token_status).data,
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            204: OpenApiResponse(
                description="로그아웃 성공. 프론트에 저장된 access, refresh 토큰 삭제 권고"
            ),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def get(self, request):
        try:
            AuthService.logout(request.user)
        except BaseServiceError as e:
            raise InternalServerErrorException(code=e.code, message=e.message)

        return Response(status=status.HTTP_204_NO_CONTENT)


class WithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            204: OpenApiResponse(
                description="회원 탈퇴 성공. 프론트에 저장된 access, refresh 토큰 삭제 권고"
            ),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def get(self, request):
        try:
            AuthService.withdraw(request.user)
        except BaseServiceError as e:
            raise InternalServerErrorException(code=e.code, message=e.message)

        return Response(status=status.HTTP_204_NO_CONTENT)
