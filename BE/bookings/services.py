import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from uuid import uuid4

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from bookings.exceptions import (
    AlreadyCanceledReservationError,
    DuplicatedReservationError,
    ForbiddenTeamBookingError,
    InactiveStudioRoomError,
    InvalidBookingTimeError,
    NoAvailableRepeatDatesError,
    NotFoundBookingError,
    NotFoundStudioRoomError,
    NotFoundTeamError,
    OutsideOperatingHoursError,
)
from bookings.models import Booking, BookingStatus, BookingType
from studios.models import ClosureType, StudioRoom, StudioRoomStatus
from teams.models import Team, TeamMemberStatus, TeamStatus


@dataclass
class Slot:
    start_time: time
    end_time: time
    name: str
    memo: str
    color: str
    status: str | None = None


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
    disabled: bool


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
    kind: str
    repeat_count: int | None
    room_id: int
    room_name: str
    date: date
    start_time: time
    end_time: time
    type: str
    name: str
    memo: str
    color: str
    status: str
    team_id: int | None = None
    team_name: str | None = None


@dataclass
class ReservationList:
    reservations: list[ReservationItem]
    skipped_occurrences: list["RepeatConflictOccurrence"] | None = None


@dataclass
class RepeatOccurrence:
    week: int
    date: date


@dataclass
class RepeatConflictOccurrence:
    week: int
    date: date
    code: str
    message: str


@dataclass
class RepeatReservationCheck:
    available_occurrences: list[RepeatOccurrence]
    conflict_occurrences: list[RepeatConflictOccurrence]


class BookingCheckService:
    @staticmethod
    def check_day_booking(room_id: int, target_date: date) -> DayBookingCheck:
        room = BookingCheckService._get_room(room_id)

        if target_date is None:
            target_date = date.today()

        booking_query = (
            room.bookings.filter(
                reservation_date=target_date,
                status__in=[BookingStatus.RESERVED, BookingStatus.PENDING],
            )
            .select_related("user", "team", "team__team_color")
            .order_by("start_time")
        )

        slots: list[Slot] = []
        for booking in booking_query:
            color = "#DADADA"
            if booking.booking_type == BookingType.PRIVATE:
                name = ReservationQueryService._resolve_private_name(booking)
            else:
                name = booking.team.name
                color = booking.team.color

            slots.append(
                Slot(
                    start_time=booking.start_time,
                    end_time=booking.end_time,
                    name=name,
                    memo=booking.memo,
                    color=color,
                    status=booking.status,
                )
            )

        closures = room.closures.filter(closure_date=target_date)
        room_status = room.status
        for closure in closures:
            slots.append(
                Slot(
                    start_time=closure.start_time or room.open_time,
                    end_time=closure.end_time or room.close_time,
                    name=closure.reason or "휴무",
                    memo="",
                    color="#DADADA",
                    status=None,
                )
            )
            if closure.is_all_day:
                room_status = (
                    ClosureType.MAINTENANCE
                    if closure.closure_type == ClosureType.MAINTENANCE
                    else StudioRoomStatus.INACTIVE
                )

        slots.sort(
            key=lambda x: BookingCheckService._build_slot_sort_key(
                room=room,
                target_date=target_date,
                start_time=x.start_time,
            )
        )

        return DayBookingCheck(
            room_id=room.id,
            room_name=room.name,
            date=target_date,
            open_time=room.open_time,
            close_time=room.close_time,
            status=room_status,
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
            )
            .exclude(status=BookingStatus.CANCELED)
            .select_related("user", "team", "team__team_color")
            .order_by("reservation_date", "start_time")
        )
        closures = room.closures.filter(
            closure_date__year=target_date.year,
            closure_date__month=target_date.month,
        )

        booking_map: dict[str, list[str]] = defaultdict(list)
        disabled_dates = {
            closure.closure_date.isoformat()
            for closure in closures
            if BookingCheckService._covers_full_operating_window(
                room=room,
                target_date=closure.closure_date,
                start_time=closure.start_time,
                end_time=closure.end_time,
            )
        }

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
            days.append(
                MonthDateColor(
                    date=current_date,
                    color=colors,
                    disabled=(
                        room.status != StudioRoomStatus.ACTIVE
                        or current_date.isoformat() in disabled_dates
                    ),
                )
            )

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

    @staticmethod
    def _build_slot_sort_key(room: StudioRoom, target_date: date, start_time: time):
        return ReservationCommandService._normalize_time(
            room=room,
            target_date=target_date,
            target_time=start_time,
        )

    @staticmethod
    def _covers_full_operating_window(
        room: StudioRoom,
        target_date: date,
        start_time: time,
        end_time: time,
    ) -> bool:
        closure_start_at = ReservationCommandService._normalize_time(
            room=room,
            target_date=target_date,
            target_time=start_time,
        )
        closure_end_at = ReservationCommandService._normalize_end_time(
            room=room,
            target_date=target_date,
            start_time=start_time,
            end_time=end_time,
        )
        room_open_at = ReservationCommandService._get_room_open_datetime(
            room=room,
            target_date=target_date,
        )
        room_close_at = ReservationCommandService._get_room_close_datetime(
            room=room,
            target_date=target_date,
        )
        return closure_start_at <= room_open_at and closure_end_at >= room_close_at


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
                kind=ReservationQueryService._resolve_reservation_kind(booking),
                repeat_count=ReservationQueryService._resolve_repeat_count(booking),
                room_id=booking.room_id,
                room_name=booking.room.name,
                date=booking.reservation_date,
                start_time=booking.start_time,
                end_time=booking.end_time,
                type=booking.booking_type,
                name=ReservationQueryService._resolve_private_name(booking),
                memo=booking.memo,
                color="#DADADA",
                status=booking.status,
            )

        return ReservationItem(
            reservation_number=booking.reservation_number,
            kind=ReservationQueryService._resolve_reservation_kind(booking),
            repeat_count=ReservationQueryService._resolve_repeat_count(booking),
            room_id=booking.room_id,
            room_name=booking.room.name,
            date=booking.reservation_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            type=booking.booking_type,
            name=booking.team.name,
            memo=booking.memo,
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
        queryset = queryset.select_related(
            "room", "user", "team", "team__team_color"
        ).order_by(
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

    @staticmethod
    def _resolve_private_name(booking: Booking) -> str:
        if booking.user.is_staff and booking.title:
            return booking.title
        return booking.user.nickname or ""

    @staticmethod
    def _resolve_reservation_kind(booking: Booking) -> str:
        return "repeat" if booking.repeat_group_id else "single"

    @staticmethod
    def _resolve_repeat_count(booking: Booking) -> int | None:
        if not booking.repeat_group_id:
            return None
        if not booking.repeat_start_date or not booking.repeat_end_date:
            return None
        return ((booking.repeat_end_date - booking.repeat_start_date).days // 7) + 1


class ReservationCommandService:
    @staticmethod
    @transaction.atomic
    def create_private_reservation(
        user,
        room_id: int,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
    ) -> ReservationList:
        room = ReservationCommandService._get_active_room(room_id)
        bookings: list[Booking] = []
        repeat_metadata = ReservationCommandService._build_repeat_metadata(
            start_date=start_date,
            count=count,
        )
        for target_date in ReservationCommandService._build_recurring_dates(
            start_date=start_date,
            count=count,
        ):
            ReservationCommandService._validate_time_range(
                room=room,
                target_date=target_date,
                start_time=start_time,
                end_time=end_time,
            )

            bookings.append(
                Booking.objects.create(
                    room=room,
                    user=user,
                    booking_type=BookingType.PRIVATE,
                    reservation_date=target_date,
                    start_time=start_time,
                    end_time=end_time,
                    status=BookingStatus.PENDING,
                    **repeat_metadata,
                )
            )

        return ReservationList(
            reservations=[
                ReservationQueryService._build_reservation_item(booking)
                for booking in bookings
            ]
        )

    @staticmethod
    @transaction.atomic
    def create_team_reservation(
        user,
        room_id: int,
        team_id: int,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
    ) -> ReservationList:
        room = ReservationCommandService._get_active_room(room_id)
        team = ReservationCommandService._get_user_team(user=user, team_id=team_id)
        bookings: list[Booking] = []
        repeat_metadata = ReservationCommandService._build_repeat_metadata(
            start_date=start_date,
            count=count,
        )
        for target_date in ReservationCommandService._build_recurring_dates(
            start_date=start_date,
            count=count,
        ):
            ReservationCommandService._validate_time_range(
                room=room,
                target_date=target_date,
                start_time=start_time,
                end_time=end_time,
            )

            bookings.append(
                Booking.objects.create(
                    room=room,
                    user=user,
                    team=team,
                    booking_type=BookingType.TEAM,
                    reservation_date=target_date,
                    start_time=start_time,
                    end_time=end_time,
                    status=BookingStatus.PENDING,
                    **repeat_metadata,
                )
            )

        return ReservationList(
            reservations=[
                ReservationQueryService._build_reservation_item(booking)
                for booking in bookings
            ]
        )

    @staticmethod
    def check_repeat_reservation(
        room_id: int,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
    ) -> RepeatReservationCheck:
        room = ReservationCommandService._get_active_room(room_id)
        available_occurrences: list[RepeatOccurrence] = []
        conflict_occurrences: list[RepeatConflictOccurrence] = []

        for index, target_date in enumerate(
            ReservationCommandService._build_recurring_dates(
                start_date=start_date,
                count=count,
            ),
            start=1,
        ):
            start_at, end_at = ReservationCommandService._validate_time_window(
                room=room,
                target_date=target_date,
                start_time=start_time,
                end_time=end_time,
            )
            if ReservationCommandService._has_overlap(
                room=room,
                target_date=target_date,
                start_at=start_at,
                end_at=end_at,
            ):
                conflict_occurrences.append(
                    RepeatConflictOccurrence(
                        week=index,
                        date=target_date,
                        code=DuplicatedReservationError.code,
                        message=DuplicatedReservationError.message,
                    )
                )
            else:
                available_occurrences.append(
                    RepeatOccurrence(week=index, date=target_date)
                )

        return RepeatReservationCheck(
            available_occurrences=available_occurrences,
            conflict_occurrences=conflict_occurrences,
        )

    @staticmethod
    def check_team_repeat_reservation(
        user,
        room_id: int,
        team_id: int,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
    ) -> RepeatReservationCheck:
        ReservationCommandService._get_user_team(user=user, team_id=team_id)
        return ReservationCommandService.check_repeat_reservation(
            room_id=room_id,
            start_date=start_date,
            count=count,
            start_time=start_time,
            end_time=end_time,
        )

    @staticmethod
    @transaction.atomic
    def create_private_repeat_reservation(
        user,
        room_id: int,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
    ) -> ReservationList:
        room = ReservationCommandService._get_active_room(room_id)
        check_result = ReservationCommandService.check_repeat_reservation(
            room_id=room_id,
            start_date=start_date,
            count=count,
            start_time=start_time,
            end_time=end_time,
        )
        if not check_result.available_occurrences:
            raise NoAvailableRepeatDatesError()

        bookings = ReservationCommandService._create_repeat_bookings(
            user=user,
            room=room,
            booking_type=BookingType.PRIVATE,
            team=None,
            start_date=start_date,
            count=count,
            start_time=start_time,
            end_time=end_time,
            available_occurrences=check_result.available_occurrences,
        )
        return ReservationList(
            reservations=[
                ReservationQueryService._build_reservation_item(booking)
                for booking in bookings
            ],
            skipped_occurrences=check_result.conflict_occurrences,
        )

    @staticmethod
    @transaction.atomic
    def create_team_repeat_reservation(
        user,
        room_id: int,
        team_id: int,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
    ) -> ReservationList:
        room = ReservationCommandService._get_active_room(room_id)
        team = ReservationCommandService._get_user_team(user=user, team_id=team_id)
        check_result = ReservationCommandService.check_repeat_reservation(
            room_id=room_id,
            start_date=start_date,
            count=count,
            start_time=start_time,
            end_time=end_time,
        )
        if not check_result.available_occurrences:
            raise NoAvailableRepeatDatesError()

        bookings = ReservationCommandService._create_repeat_bookings(
            user=user,
            room=room,
            booking_type=BookingType.TEAM,
            team=team,
            start_date=start_date,
            count=count,
            start_time=start_time,
            end_time=end_time,
            available_occurrences=check_result.available_occurrences,
        )
        return ReservationList(
            reservations=[
                ReservationQueryService._build_reservation_item(booking)
                for booking in bookings
            ],
            skipped_occurrences=check_result.conflict_occurrences,
        )

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
        start_at, end_at = ReservationCommandService._validate_time_window(
            room=room,
            target_date=target_date,
            start_time=start_time,
            end_time=end_time,
        )
        ReservationCommandService._validate_no_overlap_with_bookings(
            room=room,
            target_date=target_date,
            start_at=start_at,
            end_at=end_at,
        )
        ReservationCommandService._validate_no_overlap_with_closures(
            room=room,
            target_date=target_date,
            start_at=start_at,
            end_at=end_at,
        )

    @staticmethod
    def _validate_time_window(
        room: StudioRoom,
        target_date: date,
        start_time: time,
        end_time: time,
    ):
        if not ReservationCommandService._is_half_hour_unit(start_time):
            raise InvalidBookingTimeError()

        if not ReservationCommandService._is_half_hour_unit(end_time):
            raise InvalidBookingTimeError()

        if start_time == end_time:
            raise InvalidBookingTimeError()

        start_at = ReservationCommandService._normalize_time(
            room=room,
            target_date=target_date,
            target_time=start_time,
        )
        end_at = ReservationCommandService._normalize_end_time(
            room=room,
            target_date=target_date,
            start_time=start_time,
            end_time=end_time,
        )
        room_open_at = ReservationCommandService._get_room_open_datetime(
            room=room,
            target_date=target_date,
        )
        room_close_at = ReservationCommandService._get_room_close_datetime(
            room=room,
            target_date=target_date,
        )

        if start_at >= end_at:
            raise InvalidBookingTimeError()

        if not room.is_24_hours and (start_at < room_open_at or end_at > room_close_at):
            raise OutsideOperatingHoursError()

        return start_at, end_at

    @staticmethod
    def _build_recurring_dates(start_date: date, count: int) -> list[date]:
        return [start_date + timedelta(days=7 * index) for index in range(count)]

    @staticmethod
    def _is_half_hour_unit(target_time: time) -> bool:
        return target_time.minute in (0, 30) and target_time.second == 0

    @staticmethod
    def _get_room_open_datetime(room: StudioRoom, target_date: date):
        return datetime.combine(target_date, room.open_time)

    @staticmethod
    def _get_room_close_datetime(room: StudioRoom, target_date: date):
        close_at = datetime.combine(target_date, room.close_time)
        if room.is_24_hours:
            return ReservationCommandService._get_room_open_datetime(
                room=room,
                target_date=target_date,
            ) + timedelta(days=1)
        if room.close_time < room.open_time:
            close_at += timedelta(days=1)
        return close_at

    @staticmethod
    def _normalize_time(room: StudioRoom, target_date: date, target_time: time):
        normalized_at = datetime.combine(target_date, target_time)
        if (room.is_24_hours or room.close_time < room.open_time) and (
            target_time < room.open_time
        ):
            normalized_at += timedelta(days=1)
        return normalized_at

    @staticmethod
    def _normalize_end_time(
        room: StudioRoom,
        target_date: date,
        start_time: time,
        end_time: time,
    ):
        start_at = ReservationCommandService._normalize_time(
            room=room,
            target_date=target_date,
            target_time=start_time,
        )
        end_at = ReservationCommandService._normalize_time(
            room=room,
            target_date=target_date,
            target_time=end_time,
        )
        if (
            room.is_24_hours or room.close_time < room.open_time
        ) and end_at <= start_at:
            end_at += timedelta(days=1)
        return end_at

    @staticmethod
    def _validate_no_overlap_with_bookings(
        room: StudioRoom,
        target_date: date,
        start_at,
        end_at,
    ) -> None:
        for booking in room.bookings.filter(
            reservation_date=target_date,
            status__in=[BookingStatus.RESERVED, BookingStatus.PENDING],
        ):
            booking_start_at = ReservationCommandService._normalize_time(
                room=room,
                target_date=target_date,
                target_time=booking.start_time,
            )
            booking_end_at = ReservationCommandService._normalize_end_time(
                room=room,
                target_date=target_date,
                start_time=booking.start_time,
                end_time=booking.end_time,
            )
            if start_at < booking_end_at and end_at > booking_start_at:
                raise DuplicatedReservationError()

    @staticmethod
    def _validate_no_overlap_with_closures(
        room: StudioRoom,
        target_date: date,
        start_at,
        end_at,
    ) -> None:
        for closure in room.closures.filter(closure_date=target_date):
            closure_start_time = closure.start_time or room.open_time
            closure_end_time = closure.end_time or room.close_time
            closure_start_at = ReservationCommandService._normalize_time(
                room=room,
                target_date=target_date,
                target_time=closure_start_time,
            )
            closure_end_at = ReservationCommandService._normalize_end_time(
                room=room,
                target_date=target_date,
                start_time=closure_start_time,
                end_time=closure_end_time,
            )
            if start_at < closure_end_at and end_at > closure_start_at:
                raise DuplicatedReservationError()

    @staticmethod
    def _has_overlap(
        room: StudioRoom,
        target_date: date,
        start_at,
        end_at,
    ) -> bool:
        try:
            ReservationCommandService._validate_no_overlap_with_bookings(
                room=room,
                target_date=target_date,
                start_at=start_at,
                end_at=end_at,
            )
            ReservationCommandService._validate_no_overlap_with_closures(
                room=room,
                target_date=target_date,
                start_at=start_at,
                end_at=end_at,
            )
        except DuplicatedReservationError:
            return True
        return False

    @staticmethod
    def _create_repeat_bookings(
        user,
        room: StudioRoom,
        booking_type: str,
        team: Team | None,
        start_date: date,
        count: int,
        start_time: time,
        end_time: time,
        available_occurrences: list[RepeatOccurrence],
    ) -> list[Booking]:
        repeat_group_id = uuid4()
        repeat_weekdays = [ReservationCommandService._to_spec_weekday(start_date)]
        repeat_end_date = start_date + timedelta(days=7 * (count - 1))
        return [
            Booking.objects.create(
                room=room,
                user=user,
                team=team,
                booking_type=booking_type,
                reservation_date=occurrence.date,
                start_time=start_time,
                end_time=end_time,
                status=BookingStatus.PENDING,
                repeat_group_id=repeat_group_id,
                repeat_weekdays=repeat_weekdays,
                repeat_start_date=start_date,
                repeat_end_date=repeat_end_date,
            )
            for occurrence in available_occurrences
        ]

    @staticmethod
    def _to_spec_weekday(target_date: date) -> int:
        return (target_date.weekday() + 1) % 7

    @staticmethod
    def _build_repeat_metadata(start_date: date, count: int) -> dict:
        if count <= 1:
            return {}
        return {
            "repeat_group_id": uuid4(),
            "repeat_weekdays": [ReservationCommandService._to_spec_weekday(start_date)],
            "repeat_start_date": start_date,
            "repeat_end_date": start_date + timedelta(days=7 * (count - 1)),
        }
