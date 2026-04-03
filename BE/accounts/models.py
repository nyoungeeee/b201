from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
from django.db import models


class UserStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    WITHDRAWN = "WITHDRAWN", "WITHDRAWN"


class UserManager(BaseUserManager):
    def create_user(self, kakao_id, nickname, password=None, **extra_fields):
        if not kakao_id:
            raise ValueError("kakao_id is required")
        if not nickname:
            raise ValueError("nickname is required")

        user = self.model(
            kakao_id=kakao_id,
            nickname=nickname,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, kakao_id, nickname, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("status", UserStatus.ACTIVE)

        return self.create_user(
            kakao_id=kakao_id,
            nickname=nickname,
            password=password,
            **extra_fields,
        )


class User(AbstractBaseUser, PermissionsMixin):
    kakao_id = models.BigIntegerField(unique=True)
    nickname = models.CharField(max_length=30, unique=True)

    status = models.CharField(
        max_length=20,
        choices=UserStatus.choices,
        default=UserStatus.ACTIVE,
    )

    is_staff = models.BooleanField(default=False)  # 사장님 여부
    is_active = models.BooleanField(default=True)

    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "kakao_id"
    REQUIRED_FIELDS = ["nickname"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.id}:{self.nickname}"
