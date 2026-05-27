import os
from datetime import time

from django.db import migrations


def create_default_room(apps, schema_editor):
    if os.getenv("DJANGO_SETTINGS_MODULE") == "config.settings.test":
        return

    StudioRoom = apps.get_model("studios", "StudioRoom")

    StudioRoom.objects.update_or_create(
        id=1,
        defaults={
            "name": "b201",
            "description": "default studio room",
            "open_time": time(9, 0),
            "close_time": time(22, 0),
            "is_24_hours": False,
            "status": "ACTIVE",
            "sort_order": 1,
        },
    )

    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("""
            SELECT setval(
                pg_get_serial_sequence('rooms', 'id'),
                GREATEST((SELECT MAX(id) FROM rooms), 1),
                true
            );
            """)


class Migration(migrations.Migration):
    dependencies = [
        (
            "studios",
            "0005_rename_room_closur_room_id_e6c6b5_idx_room_closur_room_id_75d42a_idx",
        ),
    ]

    operations = [
        migrations.RunPython(create_default_room, migrations.RunPython.noop),
    ]
