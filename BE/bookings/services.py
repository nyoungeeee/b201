from collections import defaultdict
from dataclasses import dataclass
import calendar
from datetime import date, time

from bookings.models import BookingStatus, BookingType
from bookings.exceptions import NotFoundStudioRoomError
from studios.models import StudioRoom


@dataclass
class Slot:
    start_time: time
    end_time: time
    name: str
    color: str


@dataclass
class DayBookingCheck:
    room_id: int
    room_name: str
    date: date
    open_time: time
    close_time: time
    status: str
    slot: list[Slot]


@dataclass
class MonthDateColor:
    date: date
    color: list[str]


@dataclass
class MonthBookingCheck:
    room_id: int
    room_name: str
    year: int
    month: int
    days: list[MonthDateColor]


class BookingCheckService:
    @staticmethod
    def check_day_booking(room_id: int, target_date: date) -> DayBookingCheck:
        room = BookingCheckService._get_room(room_id)

        if target_date == None:
            target_date = date.today()

        booking_query = (
            room.bookings.filter(
                reservation_date=target_date,
                status=BookingStatus.RESERVED,
            )
            .select_related("user", "team")
            .order_by("start_time")
        )

        slots: list[Slot] = []
        for booking in booking_query:
            color = "#DADADA"
            if booking.booking_type == BookingType.PRIVATE:
                name = booking.user.nickname
            else:
                name = booking.team.name
                color = booking.team.color

            slots.append(
                Slot(
                    start_time=booking.start_time,
                    end_time=booking.end_time,
                    name=name,
                    color=color,
                )
            )

        closures = room.closures.filter(closure_date=target_date)
        for closure in closures:
            slots.append(
                Slot(
                    start_time=closure.start_time,
                    end_time=closure.end_time,
                    name=closure.reason or "휴무",
                    color="#DADADA",
                )
            )

        slots.sort(key=lambda x: x.start_time)

        return DayBookingCheck(
            room_id=room.id,
            room_name=room.name,
            date=target_date,
            open_time=room.open_time,
            close_time=room.close_time,
            status=room.status,
            slot=slots,
        )

    @staticmethod
    def check_month_booking(
        room_id: int, target_year: int, target_month: int
    ) -> MonthBookingCheck:
        room = BookingCheckService._get_room(room_id)

        today = date.today()
        if target_year is None:
            target_year = today.year
        if target_month is None:
            target_month = today.month

        target_date = date(year=target_year, month=target_month, day=1)

        bookings = (
            room.bookings.filter(
                reservation_date__year=target_date.year,
                reservation_date__month=target_date.month,
                status=BookingStatus.RESERVED,
            )
            .select_related("user", "team")
            .order_by("reservation_date", "start_time")
        )

        booking_map: dict[str, list[str]] = defaultdict(list)

        for booking in bookings:
            booking_date = booking.reservation_date.isoformat()
            if booking.booking_type == BookingType.PRIVATE:
                booking_map[booking_date].append("#DADADA")
            else:
                booking_map[booking_date].append(booking.team.color)

        month_last_day = calendar.monthrange(target_date.year, target_date.month)[1]

        days: list[MonthDateColor] = []
        for day in range(1, month_last_day + 1):
            current_date = date(target_date.year, target_date.month, day)
            colors = booking_map.get(current_date.isoformat(), [])
            days.append(MonthDateColor(date=current_date, color=colors))

        return MonthBookingCheck(
            room_id=room.id,
            room_name=room.name,
            year=target_date.year,
            month=target_date.month,
            days=days,
        )

    @staticmethod
    def _get_room(room_id: int) -> StudioRoom:
        try:
            return StudioRoom.objects.get(id=room_id)
        except StudioRoom.DoesNotExist:
            raise NotFoundStudioRoomError()
