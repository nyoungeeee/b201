#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys
from pathlib import Path

import dotenv

dotenv.load_dotenv(".env")

if os.getenv("DJANGO_SETTINGS_MODULE") is None:
    raise Exception(
        "DJANGO_SETTINGS_MODULE environment variable is not set. Please set it in the .env file."
    )


def main():
    """Run administrative tasks."""
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
