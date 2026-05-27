import os

from django.contrib.auth.hashers import make_password
from django.db import migrations

ROOT_ADMIN_KAKAO_ID = -1


def create_root_admin(apps, schema_editor):
    if os.getenv("DJANGO_SETTINGS_MODULE") == "config.settings.test":
        return

    root_admin_id = os.getenv("ROOT_ADMIN_ID")
    root_admin_password = os.getenv("ROOT_ADMIN_PASSWORD")

    if not root_admin_id or not root_admin_password:
        return

    User = apps.get_model("accounts", "User")
    if User.objects.filter(kakao_id=ROOT_ADMIN_KAKAO_ID).exists():
        return

    email = root_admin_id if "@" in root_admin_id else None
    User.objects.create(
        kakao_id=ROOT_ADMIN_KAKAO_ID,
        email=email,
        nickname=root_admin_id[:30],
        password=make_password(root_admin_password),
        status="ACTIVE",
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_user_email"),
    ]

    operations = [
        migrations.RunPython(create_root_admin, migrations.RunPython.noop),
    ]
