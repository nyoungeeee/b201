from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from policies.serializers import PolicyDocumentSerializer
from policies.services import PolicyDocumentService


class TermsOfServiceView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=PolicyDocumentSerializer,
                description="서비스 이용약관 조회 성공",
            ),
        },
        description="서비스 이용약관 조회",
    )
    def get(self, request):
        document = PolicyDocumentService.get_document("terms")
        return Response(
            PolicyDocumentSerializer(document).data,
            status=status.HTTP_200_OK,
        )


class PrivacyPolicyView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=PolicyDocumentSerializer,
                description="개인정보 처리방침 조회 성공",
            ),
        },
        description="개인정보 처리방침 조회",
    )
    def get(self, request):
        document = PolicyDocumentService.get_document("privacy")
        return Response(
            PolicyDocumentSerializer(document).data,
            status=status.HTTP_200_OK,
        )
