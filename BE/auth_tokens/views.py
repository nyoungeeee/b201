import logging
from urllib.parse import urljoin

from django.conf import settings
from django.shortcuts import redirect
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
    TokenStatusSerializer,
)
from .services import AuthService, KakaoOAuthStateService, TokenRefreshService

logger = logging.getLogger(__name__)


def _set_jwt_cookies(response, token_status):
    cookie_options = {
        "httponly": settings.JWT_COOKIE_HTTPONLY,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": "/",
    }
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        token_status.access,
        **cookie_options,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        token_status.refresh,
        **cookie_options,
    )


def _delete_jwt_cookies(response):
    delete_options = {
        "path": "/",
        "samesite": settings.JWT_COOKIE_SAMESITE,
    }
    response.delete_cookie(settings.JWT_ACCESS_COOKIE_NAME, **delete_options)
    response.delete_cookie(settings.JWT_REFRESH_COOKIE_NAME, **delete_options)


def _frontend_redirect_url(client: str, next_path: str) -> str:
    base_url = (
        settings.ADMIN_FRONTEND_URL if client == "admin" else settings.USER_FRONTEND_URL
    )
    return urljoin(base_url.rstrip("/") + "/", next_path.lstrip("/"))


class KakaoLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        client = request.query_params.get("client")
        next_path = request.query_params.get("next", "/")

        try:
            authorize_url = KakaoOAuthStateService.create_authorize_url(
                client,
                next_path,
            )
        except ValueError:
            raise BadRequestException(
                code="INVALID_KAKAO_LOGIN_REQUEST",
                message="카카오 로그인 요청값이 올바르지 않습니다.",
            )

        return redirect(authorize_url)


class KakaoCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        kakao_error = request.query_params.get("error")

        if not state:
            raise BadRequestException(
                code="INVALID_KAKAO_STATE",
                message="유효하지 않거나 만료된 state입니다.",
            )

        state_data = KakaoOAuthStateService.pop_state(state)
        if state_data is None:
            raise BadRequestException(
                code="INVALID_KAKAO_STATE",
                message="유효하지 않거나 만료된 state입니다.",
            )

        if kakao_error or not code:
            raise BadRequestException(
                code="KAKAO_AUTH_FAILED",
                message="카카오 인증에 실패했습니다.",
            )

        try:
            token_status, _new_user_created = AuthService.signin_from_kakao_callback(
                kakao_auth_code=code,
            )
        except UserNotFoundError as e:
            raise BadRequestException(code=e.code, message=e.message)
        except UserBlockedError as e:
            raise ForbiddenException(code=e.code, message=e.message)
        except KakaoAPIError as e:
            raise InternalServerErrorException(code=e.code, message=e.message)

        response = redirect(_frontend_redirect_url(state_data.client, state_data.next))
        _set_jwt_cookies(response, token_status)
        return response


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
                redirect_uri=serializer.validated_data["redirect_uri"],
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
        responses={
            200: TokenStatusSerializer,
            400: openapi_exception_response(InvalidOrExpiredTokenError),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise BadRequestException(
                code=InvalidOrExpiredTokenError.code,
                message=InvalidOrExpiredTokenError.message,
            )

        try:
            token_status = TokenRefreshService.refresh_tokens(
                refresh_token_str=refresh_token,
            )

        except InvalidOrExpiredTokenError as e:
            raise BadRequestException(code=e.code, message=e.message)

        response = Response({"ok": True}, status=status.HTTP_200_OK)
        _set_jwt_cookies(response, token_status)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            204: OpenApiResponse(
                description="로그아웃 성공. 프론트에 저장된 access, refresh 토큰 삭제 권고"
            ),
            500: openapi_exception_response(BaseServiceError),
        },
    )
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if request.user.is_authenticated:
            try:
                AuthService.logout(request.user)
            except BaseServiceError as e:
                raise InternalServerErrorException(code=e.code, message=e.message)
        elif refresh_token:
            try:
                TokenRefreshService.invalidate_refresh_token(refresh_token)
            except InvalidOrExpiredTokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        _delete_jwt_cookies(response)
        return response


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
