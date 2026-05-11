import logging

from django.db import OperationalError, ProgrammingError, transaction

logger = logging.getLogger(__name__)
_seeded = False

DEFAULT_TEAM_COLORS = [
    "FF6A2A",
    "FF3B3B",
    "FFD60A",
    "A7F432",
    "06D6A0",
    "00E5FF",
    "4CC9F0",
    "4361EE",
    "3A0CA3",
    "7209B7",
    "B5179E",
    "F72585",
    "F9844A",
    "90BE6D",
    "577590",
    "E76F51",
]


def ensure_default_team_colors() -> None:
    global _seeded

    from teams.models import TeamColor

    try:
        with transaction.atomic():
            for index, color in enumerate(DEFAULT_TEAM_COLORS):
                TeamColor.objects.get_or_create(
                    color=color,
                    defaults={"is_active": True, "display_order": index},
                )
        _seeded = True
    except (OperationalError, ProgrammingError):
        logger.debug("Skipped default team color seed because table is unavailable.")


def ensure_default_team_colors_once(**kwargs) -> None:
    if _seeded:
        return
    ensure_default_team_colors()
