import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, time

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from bookings.exceptions import (
    AlreadyCanceledReservationError,
    DuplicatedReservationError,
    ForbiddenTeamBookingError,
    InactiveStudioRoomError,
    InvalidBookingTimeError,
    NotFoundBookingError,
    NotFoundStudioRoomError,
    NotFoundTeamError,
    OutsideOperatingHoursError,
)
from bookings.models import Booking, BookingStatus, BookingType
from studios.models import StudioRoom, StudioRoomStatus
from teams.models import Team, TeamMemberStatus, TeamStatus


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


@dataclass
class ReservationItem:
    reservation_number: int
    room_id: int
    room_name: str
    date: date
    start_time: time
    end_time: time
    type: str
    name: str
    color: str
    status: str
    team_id: int | None = None
    team_name: str | None = None


@dataclass
class ReservationList:
    reservations: list[ReservationItem]


class BookingCheckService:
    @staticmethod
    def check_day_booking(room_id: int, target_date: date) -> DayBookingCheck:
        room = BookingCheckService._get_room(room_id)

        if target_date is None:
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


class ReservationQueryService:
    @staticmethod
    def get_my_reservations(
        user,
        target_date: date | None,
        status: list[str] | None,
        page: int,
        size: int,
    ) -> ReservationList:
        queryset = ReservationQueryService._apply_common_filters(
            Booking.objects.filter(user=user),
            target_date=target_date,
            status=status,
        )
        bookings = ReservationQueryService._paginate(queryset, page=page, size=size)
        return ReservationList(
            reservations=[
                ReservationQueryService._build_reservation_item(booking)
                for booking in bookings
            ]
        )

    @staticmethod
    def get_team_reservations(
        user,
        team_id: int | None,
        target_date: date | None,
        status: list[str] | None,
        page: int,
        size: int,
    ) -> ReservationList:
        allowed_team_ids = ReservationQueryService._get_allowed_team_ids(user)

        if team_id is not None:
            if not Team.objects.filter(id=team_id, status=TeamStatus.ACTIVE).exists():
                raise NotFoundTeamError()
            if team_id not in allowed_team_ids:
                raise ForbiddenTeamBookingError()
            allowed_team_ids = [team_id]

        queryset = ReservationQueryService._apply_common_filters(
            Booking.objects.filter(
                booking_type=BookingType.TEAM,
                team_id__in=allowed_team_ids,
            ),
            target_date=target_date,
            status=status,
        )
        bookings = ReservationQueryService._paginate(queryset, page=page, size=size)
        return ReservationList(
            reservations=[
                ReservationQueryService._build_reservation_item(booking)
                for booking in bookings
            ]
        )

    @staticmethod
    def _build_reservation_item(booking: Booking) -> ReservationItem:
        if booking.booking_type == BookingType.PRIVATE:
            return ReservationItem(
                reservation_number=booking.reservation_number,
                room_id=booking.room_id,
                room_name=booking.room.name,
                date=booking.reservation_date,
                start_time=booking.start_time,
                end_time=booking.end_time,
                type=booking.booking_type,
                name=booking.user.nickname or "",
                color="#DADADA",
                status=booking.status,
            )

        return ReservationItem(
            reservation_number=booking.reservation_number,
            room_id=booking.room_id,
            room_name=booking.room.name,
            date=booking.reservation_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            type=booking.booking_type,
            name=booking.team.name,
            color=booking.team.color,
            status=booking.status,
            team_id=booking.team_id,
            team_name=booking.team.name,
        )

    @staticmethod
    def _get_allowed_team_ids(user) -> list[int]:
        return list(
            user.team_memberships.filter(
                status=TeamMemberStatus.ACTIVE,
                team__status=TeamStatus.ACTIVE,
            ).values_list("team_id", flat=True)
        )

    @staticmethod
    def _apply_common_filters(
        queryset,
        target_date: date | None,
        status: list[str] | None,
    ):
        queryset = queryset.select_related("room", "user", "team").order_by(
            "-reservation_date",
            "-start_time",
            "-reservation_number",
        )
        if target_date is not None:
            queryset = queryset.filter(reservation_date=target_date)
        if status is not None:
            queryset = queryset.filter(status__in=status)
        return queryset

    @staticmethod
    def _paginate(queryset, page: int, size: int) -> list[Booking]:
        start = (page - 1) * size
        end = start + size
        return list(queryset[start:end])


class ReservationCommandService:
    @staticmethod
    @transaction.atomic
    def create_private_reservation(
        user,
        room_id: int,
        target_date: date,
        start_time: time,
        end_time: time,
    ) -> ReservationItem:
        room = ReservationCommandService._get_active_room(room_id)
        ReservationCommandService._validate_time_range(
            room=room,
            target_date=target_date,
            start_time=start_time,
            end_time=end_time,
        )

        booking = Booking.objects.create(
            room=room,
            user=user,
            booking_type=BookingType.PRIVATE,
            reservation_date=target_date,
            start_time=start_time,
            end_time=end_time,
            status=BookingStatus.RESERVED,
        )
        return ReservationQueryService._build_reservation_item(booking)

    @staticmethod
    @transaction.atomic
    def create_team_reservation(
        user,
        room_id: int,
        team_id: int,
        target_date: date,
        start_time: time,
        end_time: time,
    ) -> ReservationItem:
        room = ReservationCommandService._get_active_room(room_id)
        team = ReservationCommandService._get_user_team(user=user, team_id=team_id)
        ReservationCommandService._validate_time_range(
            room=room,
            target_date=target_date,
            start_time=start_time,
            end_time=end_time,
        )

        booking = Booking.objects.create(
            room=room,
            user=user,
            team=team,
            booking_type=BookingType.TEAM,
            reservation_date=target_date,
            start_time=start_time,
            end_time=end_time,
            status=BookingStatus.RESERVED,
        )
        return ReservationQueryService._build_reservation_item(booking)

    @staticmethod
    @transaction.atomic
    def cancel_reservation(user, reservation_number: int) -> None:
        try:
            booking = Booking.objects.select_related("team").get(
                reservation_number=reservation_number
            )
        except Booking.DoesNotExist:
            raise NotFoundBookingError()

        if booking.status == BookingStatus.CANCELED:
            raise AlreadyCanceledReservationError()

        if booking.booking_type == BookingType.PRIVATE:
            if booking.user_id != user.id:
                raise ForbiddenTeamBookingError()
        else:
            is_team_member = user.team_memberships.filter(
                team_id=booking.team_id,
                status=TeamMemberStatus.ACTIVE,
                team__status=TeamStatus.ACTIVE,
            ).exists()
            if booking.user_id != user.id and not is_team_member:
                raise ForbiddenTeamBookingError()

        booking.status = BookingStatus.CANCELED
        booking.canceled_at = timezone.now()
        booking.save(update_fields=["status", "canceled_at", "updated_at"])

    @staticmethod
    def _get_active_room(room_id: int) -> StudioRoom:
        room = BookingCheckService._get_room(room_id)
        if room.status != StudioRoomStatus.ACTIVE:
            raise InactiveStudioRoomError()
        return room

    @staticmethod
    def _get_user_team(user, team_id: int) -> Team:
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise NotFoundTeamError()

        if team.status != TeamStatus.ACTIVE:
            raise NotFoundTeamError()

        is_member = user.team_memberships.filter(
            team_id=team.id,
            status=TeamMemberStatus.ACTIVE,
            team__status=TeamStatus.ACTIVE,
        ).exists()
        if not is_member:
            raise ForbiddenTeamBookingError()

        return team

    @staticmethod
    def _validate_time_range(
        room: StudioRoom,
        target_date: date,
        start_time: time,
        end_time: time,
    ) -> None:
        if start_time >= end_time:
            raise InvalidBookingTimeError()

        if start_time < room.open_time or end_time > room.close_time:
            raise OutsideOperatingHoursError()

        overlap_filter = Q(start_time__lt=end_time, end_time__gt=start_time)

        duplicated_booking_exists = (
            room.bookings.filter(
                reservation_date=target_date,
                status=BookingStatus.RESERVED,
            )
            .filter(overlap_filter)
            .exists()
        )
        if duplicated_booking_exists:
            raise DuplicatedReservationError()

        closure_exists = (
            room.closures.filter(closure_date=target_date)
            .filter(overlap_filter)
            .exists()
        )
        if closure_exists:
            raise DuplicatedReservationError()
