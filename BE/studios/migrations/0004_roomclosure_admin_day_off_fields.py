from django.db import migrations, models


def copy_closure_date(apps, schema_editor):
    RoomClosure = apps.get_model("studios", "RoomClosure")
    for closure in RoomClosure.objects.all():
        closure.start_date = closure.closure_date
        closure.end_date = closure.closure_date
        closure.save(update_fields=["start_date", "end_date"])


class Migration(migrations.Migration):

    dependencies = [
        ("studios", "0003_studioroom_created_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="roomclosure",
            name="room",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name="closures",
                to="studios.studioroom",
            ),
        ),
        migrations.AddField(
            model_name="roomclosure",
            name="end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="roomclosure",
            name="is_all_day",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="roomclosure",
            name="start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="roomclosure",
            name="end_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="roomclosure",
            name="start_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.RunPython(copy_closure_date, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name="roomclosure",
            index=models.Index(
                fields=["room", "start_date", "end_date"],
                name="room_closur_room_id_e6c6b5_idx",
            ),
        ),
    ]
