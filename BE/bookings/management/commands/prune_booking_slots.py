from datetime import date

from django.core.management.base import BaseCommand, CommandError

from bookings.models import BookingSlot
from bookings.services import ReservationCommandService


class Command(BaseCommand):
    help = "Delete booking slot rows before the given reservation date."

    def add_arguments(self, parser):
        parser.add_argument(
            "--before",
            required=True,
            help="Delete slots whose reservation_date is before YYYY-MM-DD.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete rows. Without this flag, only prints the count.",
        )

    def handle(self, *args, **options):
        try:
            cutoff_date = date.fromisoformat(options["before"])
        except ValueError as e:
            raise CommandError("--before must be formatted as YYYY-MM-DD") from e

        queryset = BookingSlot.objects.filter(reservation_date__lt=cutoff_date)
        count = queryset.count()
        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run: {count} booking slot rows before {cutoff_date} would be deleted."
                )
            )
            return

        deleted_count = ReservationCommandService.prune_booking_slots_before(
            cutoff_date
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {deleted_count} booking slot rows before {cutoff_date}."
            )
        )
