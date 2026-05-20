from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0003_booking_title_memo"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="canceled_occurrence_dates",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="booking",
            name="repeat_end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="repeat_group_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="repeat_start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="repeat_weekdays",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(
                fields=["repeat_group_id"], name="reservatio_repeat__0476a7_idx"
            ),
        ),
    ]
