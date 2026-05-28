from django.conf import settings
from django.db import models


class AdminActionLog(models.Model):
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="admin_action_logs",
    )
    category = models.CharField(max_length=20)
    action = models.CharField(max_length=100)
    target = models.CharField(max_length=100, blank=True, default="")
    detail = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "admin_action_logs"
        indexes = [
            models.Index(fields=["-created_at", "-id"]),
            models.Index(fields=["category", "-created_at", "-id"]),
        ]
        ordering = ["-created_at", "-id"]
