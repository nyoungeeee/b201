from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "id",
        "kakao_id",
        "email",
        "nickname",
        "status",
        "is_staff",
        "is_active",
        "created_at",
    )
    list_filter = ("status", "is_staff", "is_active", "is_superuser")
    search_fields = ("=kakao_id", "email", "nickname")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "last_login")

    fieldsets = (
        (None, {"fields": ("kakao_id", "password")}),
        ("개인 정보", {"fields": ("email", "nickname")}),
        ("상태", {"fields": ("status", "is_active", "deleted_at")}),
        (
            "권한",
            {
                "fields": (
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("일시", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "kakao_id",
                    "email",
                    "nickname",
                    "password1",
                    "password2",
                    "status",
                    "is_staff",
                    "is_superuser",
                    "is_active",
                ),
            },
        ),
    )
