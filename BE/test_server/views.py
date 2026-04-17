from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.service_exceptions import BaseServiceError
from common.swagger import openapi_exception_response


from auth_tokens.serializers import SigninResponseSerializer
from test_server.services import TestSigninService

from .serializers import TestSigninRequestSerializer

from common.service_exceptions import BaseServiceError


class TestSigninView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        description="테스트 로그인 엔드포인트 닉네임으로 유저 생성 및 로그인. is_staff 값으로 관리자 권한 부여 가능",
        request=TestSigninRequestSerializer(),
        responses={
            200: SigninResponseSerializer(),
            400: openapi_exception_response(BaseServiceError),
        },
    )
    def post(self, request):
        serializer = TestSigninRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nickname = serializer.validated_data["nickname"]
        is_staff = serializer.validated_data["is_staff"]

        signin_response = TestSigninService.signin(nickname=nickname, is_staff=is_staff)
        return Response(
            SigninResponseSerializer(signin_response).data, status=status.HTTP_200_OK
        )
