from django.contrib import admin
from .models import RefreshToken


@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "updated_at")
    search_fields = ("user__kakao_id", "user__nickname")
    readonly_fields = ("token_hash", "updated_at")
