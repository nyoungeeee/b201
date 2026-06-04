from rest_framework import status

from .base import BaseAccountAPITestCase


class MePatchAPITestCase(BaseAccountAPITestCase):
    # 닉네임 수정 요청이 성공하면 변경된 사용자 정보가 반환되는지 검증한다.
    def test_patch_user_info_updates_nickname(self):
        response = self.client.patch(
            "/v1/me/",
            {"nickname": "newnickname"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.nickname, "newnickname")
        self.assertEqual(response.data["nickname"], "newnickname")

    # 이미 사용 중인 닉네임으로 수정하면 충돌 응답이 반환되는지 검증한다.
    def test_patch_user_info_rejects_duplicate_nickname(self):
        response = self.client.patch(
            "/v1/me/",
            {"nickname": self.other_user.nickname},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "NICKNAME_ALREADY_EXISTS")

    # nickname 누락 시 serializer 검증 오류 응답이 반환되는지 검증한다.
    def test_patch_user_info_requires_nickname(self):
        response = self.client.patch("/v1/me/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")

    # 닉네임은 영문 대소문자를 구분하지 않고 중복 검증하는지 확인한다.
    def test_patch_user_info_rejects_case_insensitive_duplicate_nickname(self):
        response = self.client.patch(
            "/v1/me/",
            {"nickname": self.other_user.nickname.upper()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "NICKNAME_ALREADY_EXISTS")

    # 닉네임은 특수문자와 공백을 허용하지 않는지 검증한다.
    def test_patch_user_info_rejects_nickname_with_special_characters(self):
        response = self.client.patch(
            "/v1/me/",
            {"nickname": "new-name"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")

    # 닉네임은 한글 8자 또는 영문/숫자 16자를 초과할 수 없는지 검증한다.
    def test_patch_user_info_rejects_too_long_nickname(self):
        response = self.client.patch(
            "/v1/me/",
            {"nickname": "abcdefghijklmno12"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_INPUT")

    # 닉네임은 한글 8자까지 허용되는지 검증한다.
    def test_patch_user_info_accepts_eight_korean_characters(self):
        response = self.client.patch(
            "/v1/me/",
            {"nickname": "가나다라마바사아"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.nickname, "가나다라마바사아")
