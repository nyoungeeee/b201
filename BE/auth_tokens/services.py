from dataclasses import dataclass
from typing import Dict, List
import hashlib
import requests
import secrets
import uuid
from urllib.parse import urlencode

from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

from accounts.models import UserStatus
from accounts.services import UserInfoService
from auth_tokens.exceptions import (
    InvalidOrExpiredTokenError,
    KakaoAPIError,
    UserAlreadyExistsError,
    UserBlockedError,
    UserNotFoundError,
)
from teams.models import TeamMemberStatus, TeamStatus
from .models import RefreshToken

User = get_user_model()


@dataclass
class TokenStatus:
    access: str
    refresh: str


@dataclass
class SigninResponse:
    id: int
    email: str | None
    nickname: str
    team: List[Dict[str, str]]
    token: TokenStatus


@dataclass
class KakaoUserInfo:
    kakao_id: int
    email: str


@dataclass
class KakaoLoginState:
    client: str
    next: str


class KakaoOAuthStateService:
    CACHE_KEY_PREFIX = "oauth:kakao:state:"
    TTL_SECONDS = 300
    ALLOWED_CLIENTS = {"user", "admin"}

    @classmethod
    def create_authorize_url(cls, client: str, next_path: str) -> str:
        state_data = cls.validate_login_params(client, next_path)
        state = secrets.token_urlsafe(32)
        cache.set(
            cls._cache_key(state),
            {"client": state_data.client, "next": state_data.next},
            cls.TTL_SECONDS,
        )

        return "https://kauth.kakao.com/oauth/authorize?" + urlencode(
            {
                "client_id": settings.KAKAO_REST_API_KEY,
                "redirect_uri": settings.KAKAO_REDIRECT_URI,
                "response_type": "code",
                "state": state,
            }
        )

    @classmethod
    def pop_state(cls, state: str) -> KakaoLoginState | None:
        cache_key = cls._cache_key(state)
        value = cache.get(cache_key)
        if value is None:
            return None

        cache.delete(cache_key)
        client = value.get("client")
        next_path = value.get("next")
        if client not in cls.ALLOWED_CLIENTS or not cls.is_safe_next(next_path):
            return None

        return KakaoLoginState(client=client, next=next_path)

    @classmethod
    def validate_login_params(cls, client: str, next_path: str) -> KakaoLoginState:
        if client not in cls.ALLOWED_CLIENTS:
            raise ValueError("client must be user or admin")

        if not cls.is_safe_next(next_path):
            raise ValueError("next must be an internal path")

        return KakaoLoginState(client=client, next=next_path)

    @staticmethod
    def is_safe_next(next_path: str | None) -> bool:
        if not isinstance(next_path, str):
            return False

        lower_next = next_path.lower()
        return (
            next_path.startswith("/")
            and not next_path.startswith("//")
            and "://" not in next_path
            and not lower_next.startswith("javascript:")
        )

    @classmethod
    def _cache_key(cls, state: str) -> str:
        return f"{cls.CACHE_KEY_PREFIX}{state}"


class TokenRefreshService:
    @staticmethod
    @transaction.atomic
    def generate_tokens(user) -> TokenStatus:
        refresh = JWTRefreshToken.for_user(user)
        token_str = str(refresh)
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()

        RefreshToken.objects.create(user=user, token_hash=token_hash)

        return TokenStatus(
            access=str(refresh.access_token),
            refresh=token_str,
        )

    @staticmethod
    @transaction.atomic
    def refresh_tokens(refresh_token_str: str) -> TokenStatus:
        try:
            JWTRefreshToken(refresh_token_str)
        except TokenError:
            raise InvalidOrExpiredTokenError()

        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()

        try:
            db_token = (
                RefreshToken.objects.select_for_update()
                .select_related("user")
                .get(token_hash=token_hash)
            )
        except RefreshToken.DoesNotExist:
            raise InvalidOrExpiredTokenError()

        user = db_token.user

        if user.status != UserStatus.ACTIVE or not user.is_active:
            raise InvalidOrExpiredTokenError()

        db_token.delete()

        return TokenRefreshService.generate_tokens(user)

    @staticmethod
    @transaction.atomic
    def invalidate_refresh_token(refresh_token_str: str) -> None:
        try:
            JWTRefreshToken(refresh_token_str)
        except TokenError:
            raise InvalidOrExpiredTokenError()

        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        deleted_count, _ = RefreshToken.objects.filter(token_hash=token_hash).delete()
        if deleted_count == 0:
            raise InvalidOrExpiredTokenError()

    @staticmethod
    @transaction.atomic
    def invalidate_user_tokens(user) -> None:
        RefreshToken.objects.filter(user=user).delete()


class KakaoAuthService:
    TOKEN_URL = "https://kauth.kakao.com/oauth/token"
    USER_ME_URL = "https://kapi.kakao.com/v2/user/me"

    @staticmethod
    @transaction.atomic
    def get_user_from_kakao_auth_code(
        kakao_auth_code: str,
        redirect_uri: str,
    ) -> tuple[User, bool]:
        new_user_created = False
        access_token = KakaoAuthService._get_access_token(
            kakao_auth_code,
            redirect_uri,
        )
        kakao_user_info = KakaoAuthService._get_kakao_user_info(access_token)

        try:
            user = User.objects.get(kakao_id=kakao_user_info.kakao_id)
            if user.email != kakao_user_info.email:
                user.email = kakao_user_info.email
                user.save(update_fields=["email"])
        except User.DoesNotExist:
            # 신규 사용자 생성
            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        kakao_id=kakao_user_info.kakao_id,
                        email=kakao_user_info.email,
                        nickname=UserInfoService.generate_random_nickname(),
                    )
                    new_user_created = True
            except IntegrityError:
                raise UserAlreadyExistsError()
        return user, new_user_created

    @staticmethod
    def _get_access_token(kakao_auth_code: str, redirect_uri: str) -> str:
        try:
            response = requests.post(
                KakaoAuthService.TOKEN_URL,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                },
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.KAKAO_REST_API_KEY,
                    "redirect_uri": redirect_uri,
                    "code": kakao_auth_code,
                    "client_secret": settings.KAKAO_CLIENT_SECRET,
                },
                timeout=5,
            )
        except requests.RequestException as e:
            raise KakaoAPIError() from e

        if response.status_code != 200:
            raise KakaoAPIError()

        data = response.json()
        access_token = data.get("access_token")

        if not access_token:
            raise KakaoAPIError()

        return access_token

    @staticmethod
    def _get_kakao_user_info(access_token: str) -> KakaoUserInfo:
        try:
            response = requests.get(
                KakaoAuthService.USER_ME_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                },
                timeout=5,
            )
        except requests.RequestException as e:
            raise KakaoAPIError() from e

        if response.status_code != 200:
            raise KakaoAPIError()

        data = response.json()
        kakao_user_id = data.get("id")
        kakao_account = data.get("kakao_account") or {}
        email = kakao_account.get("email")

        if kakao_user_id is None or not email:
            raise KakaoAPIError()

        return KakaoUserInfo(kakao_id=int(kakao_user_id), email=email)


class AuthService:
    @staticmethod
    def signin_from_kakao_callback(kakao_auth_code: str) -> tuple[TokenStatus, bool]:
        user, new_user_created = KakaoAuthService.get_user_from_kakao_auth_code(
            kakao_auth_code,
            settings.KAKAO_REDIRECT_URI,
        )

        if user.status == UserStatus.BLOCKED:
            raise UserBlockedError()

        if user.status == UserStatus.WITHDRAWN or not user.is_active:
            raise UserNotFoundError()

        return TokenRefreshService.generate_tokens(user), new_user_created

    @staticmethod
    def signin(
        kakao_auth_code: str,
        redirect_uri: str,
    ) -> tuple[SigninResponse, bool]:
        user, new_user_created = KakaoAuthService.get_user_from_kakao_auth_code(
            kakao_auth_code,
            redirect_uri,
        )

        if user.status == UserStatus.BLOCKED:
            raise UserBlockedError()

        if user.status == UserStatus.WITHDRAWN or not user.is_active:
            raise UserNotFoundError()

        token_status = TokenRefreshService.generate_tokens(user)

        return (
            SigninResponse(
                id=user.id,
                email=user.email,
                nickname=user.nickname,
                team=[
                    {
                        "name": team_member.team.name,
                        "id": team_member.team.id,
                        "color": team_member.team.color,
                    }
                    for team_member in user.team_memberships.filter(
                        status=TeamMemberStatus.ACTIVE, team__status=TeamStatus.ACTIVE
                    ).select_related("team", "team__team_color")
                ],
                token=token_status,
            ),
            new_user_created,
        )

    @staticmethod
    def logout(user) -> None:
        TokenRefreshService.invalidate_user_tokens(user)

    @staticmethod
    @transaction.atomic
    def withdraw(user) -> None:
        TokenRefreshService.invalidate_user_tokens(user)

        user.is_active = False
        user.status = UserStatus.WITHDRAWN
        user.deleted_at = timezone.now()
        user.nickname = str(uuid.uuid4())[:30]
        user.save(update_fields=["is_active", "status", "deleted_at", "nickname"])
