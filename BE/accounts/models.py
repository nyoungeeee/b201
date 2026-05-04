from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower


class UserStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    WITHDRAWN = "WITHDRAWN", "WITHDRAWN"
    BLOCKED = "BLOCKED", "BLOCKED"


class UserManager(BaseUserManager):
    def create_user(self, kakao_id, password=None, **extra_fields):
        if not kakao_id:
            raise ValueError("kakao_id is required")

        user = self.model(
            kakao_id=kakao_id,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, kakao_id, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("status", UserStatus.ACTIVE)

        return self.create_user(
            kakao_id=kakao_id,
            password=password,
            **extra_fields,
        )


class User(AbstractBaseUser, PermissionsMixin):
    kakao_id = models.BigIntegerField(unique=True)
    email = models.EmailField(unique=True, null=True)
    nickname = models.CharField(max_length=30, null=True)

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

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                Lower("nickname"),
                condition=Q(nickname__isnull=False),
                name="unique_nickname_case_insensitive_when_not_null",
            )
        ]
