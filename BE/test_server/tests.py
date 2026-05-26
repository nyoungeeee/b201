from io import StringIO
from pathlib import Path
from datetime import date, time

from django.core.management import call_command
from django.test import TestCase
import yaml

from accounts.models import User
from bookings.models import Booking, ReservationRepeatOccurrence
from studios.models import RoomClosure, StudioRoom
from teams.models import Team
from test_server.management.commands.seed_test_dummy_data import build_occupied_slot_map


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
        self.assertEqual(StudioRoom.objects.count(), 1)
        self.assertEqual(StudioRoom.objects.get().name, "b201")
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
        self.assertFalse(StudioRoom.objects.exclude(name="b201").exists())

    def test_create_private_reservation_with_count_creates_repeat_occurrences(self):
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
        from test_server.management.commands.seed_test_dummy_data import (
            SeedUser,
            create_private_reservation,
        )

        user = User.objects.first()
        creator = SeedUser(
            id=user.id,
            nickname=user.nickname,
            is_staff=False,
        )
        room = StudioRoom.objects.get(name="b201")

        create_private_reservation(
            creator=creator,
            room_id=room.id,
            target_date=date(2026, 6, 1),
            start_time=time(9, 0),
            end_time=time(10, 0),
            count=3,
        )

        self.assertEqual(ReservationRepeatOccurrence.objects.count(), 3)

    def test_seed_dummy_data_creates_holidays_as_all_day(self):
        call_command(
            "seed_test_dummy_data",
            seed=1,
            user_count=8,
            team_count=2,
            team_member_count=4,
            start_date="2026-06-01",
            end_date="2026-06-07",
            skip_reservations=True,
            stdout=StringIO(),
            verbosity=0,
        )

        holidays = RoomClosure.objects.filter(closure_type="HOLIDAY")

        self.assertTrue(holidays.exists())
        self.assertFalse(holidays.filter(is_all_day=False).exists())
        self.assertFalse(
            holidays.filter(start_time__isnull=False, end_time__isnull=False).exists()
        )

    def test_seed_occupied_slot_map_treats_all_day_holiday_as_closed(self):
        target_date = date(2026, 6, 1)
        room = StudioRoom.objects.create(
            name="seed-room",
            open_time=time(9, 0),
            close_time=time(23, 0),
            is_24_hours=False,
        )
        RoomClosure.objects.create(
            room=room,
            closure_date=target_date,
            start_date=target_date,
            end_date=target_date,
            start_time=None,
            end_time=None,
            is_all_day=True,
            closure_type="HOLIDAY",
            reason="휴무",
        )

        occupied = build_occupied_slot_map([room], target_date, target_date)

        self.assertEqual(occupied[(room.id, target_date)], set(range(28)))


class DockerComposeSeedConfigTests(TestCase):
    def test_seed_service_resets_and_seeds_database_without_backend_server(self):
        compose_path = Path(__file__).resolve().parents[1] / "docker-compose.yml"
        compose_config = yaml.safe_load(compose_path.read_text(encoding="utf-8"))
        services = compose_config["services"]
        seed_config = services["seed_dummy_data"]
        command = seed_config["command"]

        self.assertNotIn("web", services)
        self.assertIn("DROP SCHEMA public CASCADE", command)
        self.assertIn("CREATE SCHEMA public", command)
        self.assertIn("python manage.py migrate", command)
        self.assertIn("python manage.py seed_test_dummy_data", command)
        self.assertNotIn("runserver", command)
