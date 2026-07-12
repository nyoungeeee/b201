import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

from accounts.models import User, UserStatus

CALENDAR_TOKEN_VERSION = 1


class InvalidCalendarToken(Exception):
    pass


class CalendarTokenService:
    @staticmethod
    def _fernet() -> Fernet:
        key_material = f"{settings.SECRET_KEY}:b201-calendar-subscription".encode(
            "utf-8"
        )
        key = base64.urlsafe_b64encode(hashlib.sha256(key_material).digest())
        return Fernet(key)

    @classmethod
    def issue(cls, user_id: int) -> str:
        payload = json.dumps(
            {"version": CALENDAR_TOKEN_VERSION, "user_id": user_id},
            separators=(",", ":"),
        ).encode("utf-8")
        return cls._fernet().encrypt(payload).decode("ascii")

    @classmethod
    def resolve_user(cls, token: str) -> User:
        try:
            payload = json.loads(cls._fernet().decrypt(token.encode("ascii")))
            if payload.get("version") != CALENDAR_TOKEN_VERSION:
                raise InvalidCalendarToken
            user_id = int(payload["user_id"])
        except (
            AttributeError,
            InvalidToken,
            UnicodeError,
            ValueError,
            TypeError,
            KeyError,
            json.JSONDecodeError,
        ):
            raise InvalidCalendarToken from None

        try:
            return User.objects.get(
                id=user_id,
                status=UserStatus.ACTIVE,
                is_active=True,
            )
        except User.DoesNotExist:
            raise InvalidCalendarToken from None
