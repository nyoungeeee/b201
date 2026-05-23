from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase
import yaml

from accounts.models import User
from bookings.models import Booking
from studios.models import StudioRoom
from teams.models import Team


class SeedTestDummyDataCommandTests(TestCase):
    def test_seed_core_dummy_data_without_reservations(self):
        call_command(
            "seed_test_dummy_data",
            user_count=6,
            team_count=2,
            team_member_count=4,
            start_date="2026-06-01",
            end_date="2026-06-03",
            skip_reservations=True,
            stdout=StringIO(),
            verbosity=0,
        )

        self.assertEqual(User.objects.count(), 6)
        self.assertEqual(Team.objects.count(), 2)
        self.assertEqual(StudioRoom.objects.count(), 4)
        self.assertEqual(Booking.objects.count(), 0)

    def test_seed_dummy_data_creates_reservations(self):
        call_command(
            "seed_test_dummy_data",
            user_count=8,
            team_count=2,
            team_member_count=4,
            start_date="2026-06-01",
            end_date="2026-06-03",
            stdout=StringIO(),
            verbosity=0,
        )

        self.assertGreater(Booking.objects.count(), 0)


class DockerComposeSeedConfigTests(TestCase):
    def test_web_service_resets_and_seeds_database_before_runserver(self):
        compose_path = Path(__file__).resolve().parents[1] / "docker-compose.yml"
        compose_config = yaml.safe_load(compose_path.read_text(encoding="utf-8"))
        web_config = compose_config["services"]["web"]
        command = web_config["command"]

        self.assertIn("DROP SCHEMA public CASCADE", command)
        self.assertIn("CREATE SCHEMA public", command)
        self.assertIn("python manage.py migrate", command)
        self.assertIn("python manage.py seed_test_dummy_data", command)
        self.assertIn("python manage.py runserver 0.0.0.0:8000", command)
        self.assertIn(
            "${BACKEND_HOST:-127.0.0.1}:${BACKEND_PORT:-8000}:8000", web_config["ports"]
        )
