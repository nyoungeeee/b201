from django.apps import AppConfig
from django.db.backends.signals import connection_created
from django.db.models.signals import post_migrate


class TeamsConfig(AppConfig):
    name = "teams"

    def ready(self):
        from common.team_colors import ensure_default_team_colors_once

        connection_created.connect(
            ensure_default_team_colors_once,
            dispatch_uid="ensure_default_team_colors_on_connection",
        )
        post_migrate.connect(
            ensure_default_team_colors_once,
            sender=self,
            dispatch_uid="ensure_default_team_colors_after_migrate",
        )
