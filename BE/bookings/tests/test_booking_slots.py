from datetime import date, time, timedelta
from io import StringIO

from django.core.management import call_command
from rest_framework import status

from bookings.exceptions import DuplicatedReservationError
from bookings.models import Booking, BookingSlot, BookingStatus, BookingType
from bookings.services import ReservationCommandService
from .base import BaseBookingAPITestCase


class BookingSlotAPITestCase(BaseBookingAPITestCase):
    def test_create_private_reservation_creates_half_hour_slots(self):
        response = self.client.post(
            f"/v1/reservations/{self.room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"]
        )
        self.assertEqual(
            list(
                BookingSlot.objects.filter(booking=booking)
                .order_by("slot_time")
                .values_list("slot_time", flat=True)
            ),
            [time(9, 0), time(9, 30)],
        )

    def test_cross_midnight_reservation_slots_stay_on_operating_date(self):
        response = self.client.post(
            f"/v1/reservations/{self.overnight_room.id}",
            {
                "type": "private",
                "start_date": self.today.isoformat(),
                "start_time": "23:00:00",
                "end_time": "01:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking = Booking.objects.get(
            reservation_number=response.data["reservations"][0]["reservation_number"]
        )
        self.assertEqual(
            list(
                BookingSlot.objects.filter(booking=booking)
                .order_by("slot_time")
                .values_list("reservation_date", "slot_time")
            ),
            [
                (self.today, time(0, 0)),
                (self.today, time(0, 30)),
                (self.today, time(23, 0)),
                (self.today, time(23, 30)),
            ],
        )

    def test_slot_unique_collision_rolls_back_booking(self):
        stale_booking = Booking.objects.create(
            room=self.room,
            user=self.other_user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.CANCELED,
        )
        BookingSlot.objects.create(
            booking=stale_booking,
            room=self.room,
            reservation_date=self.today,
            slot_time=time(9, 0),
        )

        with self.assertRaises(DuplicatedReservationError):
            ReservationCommandService.create_private_reservation(
                user=self.user,
                room_id=self.room.id,
                start_date=self.today,
                count=1,
                start_time=time(9, 0),
                end_time=time(10, 0),
            )

        self.assertFalse(
            Booking.objects.filter(
                user=self.user,
                room=self.room,
                reservation_date=self.today,
                start_time=time(9, 0),
                end_time=time(10, 0),
            ).exists()
        )

    def test_cancel_reservation_releases_slots(self):
        reservation_list = ReservationCommandService.create_private_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.today,
            count=1,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        reservation_number = reservation_list.reservations[0].reservation_number
        self.assertEqual(
            BookingSlot.objects.filter(booking_id=reservation_number).count(), 2
        )

        ReservationCommandService.cancel_reservation(
            user=self.user,
            reservation_number=reservation_number,
        )

        self.assertEqual(
            BookingSlot.objects.filter(booking_id=reservation_number).count(), 0
        )

    def test_cancel_repeat_occurrence_releases_only_target_booking_slots(self):
        reservation_list = ReservationCommandService.create_private_repeat_reservation(
            user=self.user,
            room_id=self.room.id,
            start_date=self.tomorrow,
            count=2,
            start_time=time(13, 0),
            end_time=time(14, 0),
        )
        first_number = reservation_list.reservations[0].reservation_number
        second_number = reservation_list.reservations[1].reservation_number

        ReservationCommandService.cancel_repeat_occurrences(
            user=self.user,
            reservation_number=first_number,
            dates=[self.tomorrow + timedelta(days=7)],
        )

        self.assertEqual(BookingSlot.objects.filter(booking_id=first_number).count(), 2)
        self.assertEqual(
            BookingSlot.objects.filter(booking_id=second_number).count(), 0
        )


class BookingSlotPruneCommandTestCase(BaseBookingAPITestCase):
    def test_prune_booking_slots_command_supports_dry_run_and_apply(self):
        old_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today - timedelta(days=30),
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.CANCELED,
        )
        new_booking = Booking.objects.create(
            room=self.room,
            user=self.user,
            booking_type=BookingType.PRIVATE,
            reservation_date=self.today,
            start_time=time(9, 0),
            end_time=time(10, 0),
            status=BookingStatus.PENDING,
        )
        BookingSlot.objects.create(
            booking=old_booking,
            room=self.room,
            reservation_date=old_booking.reservation_date,
            slot_time=time(9, 0),
        )
        BookingSlot.objects.create(
            booking=new_booking,
            room=self.room,
            reservation_date=new_booking.reservation_date,
            slot_time=time(9, 0),
        )
        cutoff = date.today().isoformat()

        dry_run_output = StringIO()
        call_command("prune_booking_slots", "--before", cutoff, stdout=dry_run_output)
        self.assertIn("Dry run: 1 booking slot rows", dry_run_output.getvalue())
        self.assertEqual(BookingSlot.objects.count(), 2)

        apply_output = StringIO()
        call_command(
            "prune_booking_slots",
            "--before",
            cutoff,
            "--apply",
            stdout=apply_output,
        )

        self.assertIn("Deleted 1 booking slot rows", apply_output.getvalue())
        self.assertEqual(BookingSlot.objects.count(), 1)
        self.assertTrue(BookingSlot.objects.filter(booking=new_booking).exists())
