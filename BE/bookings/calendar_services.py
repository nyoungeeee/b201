import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone as datetime_timezone
from zoneinfo import ZoneInfo

from django.db.models import Q, QuerySet, Subquery
from django.utils import timezone

from bookings.models import Booking, BookingStatus, BookingType
from teams.models import TeamMember, TeamMemberStatus, TeamStatus

CALENDAR_EVENT_LIMIT = 300
CALENDAR_REFRESH_INTERVAL = "PT12H"


@dataclass(frozen=True)
class CalendarFeed:
    content: bytes
    etag: str
    last_modified: datetime | None


class ReservationCalendarService:
    @staticmethod
    def _base_queryset(user_id: int) -> QuerySet[Booking]:
        active_team_ids = TeamMember.objects.filter(
            user_id=user_id,
            status=TeamMemberStatus.ACTIVE,
            team__status=TeamStatus.ACTIVE,
        ).values("team_id")
        scope = Q(user_id=user_id, booking_type=BookingType.PRIVATE) | Q(
            booking_type=BookingType.TEAM,
            team_id__in=Subquery(active_team_ids),
        )
        return (
            Booking.objects.filter(scope)
            .select_related("room", "team")
            .only(
                "reservation_number",
                "booking_type",
                "reservation_date",
                "start_time",
                "end_time",
                "title",
                "status",
                "updated_at",
                "room__name",
                "team__name",
            )
        )

    @classmethod
    def get_bookings(cls, user_id: int) -> list[Booking]:
        now = timezone.localtime()
        today = now.date()
        current_time = now.time()
        is_upcoming = Q(reservation_date__gt=today) | Q(
            reservation_date=today,
            end_time__gte=current_time,
        )
        has_ended = Q(reservation_date__lt=today) | Q(
            reservation_date=today,
            end_time__lt=current_time,
        )
        is_inactive = Q(status__in=[BookingStatus.CANCELED, BookingStatus.REJECTED])

        base_queryset = cls._base_queryset(user_id)
        upcoming = list(
            base_queryset.filter(~is_inactive & is_upcoming).order_by(
                "reservation_date", "start_time", "reservation_number"
            )[:CALENDAR_EVENT_LIMIT]
        )
        remaining = CALENDAR_EVENT_LIMIT - len(upcoming)
        if remaining == 0:
            return upcoming

        recent_past = list(
            base_queryset.filter(is_inactive | has_ended).order_by(
                "-reservation_date", "-start_time", "-reservation_number"
            )[:remaining]
        )
        return sorted(
            [*upcoming, *recent_past],
            key=lambda booking: (
                booking.reservation_date,
                booking.start_time,
                booking.reservation_number,
            ),
        )

    @classmethod
    def build_feed(cls, user_id: int) -> CalendarFeed:
        bookings = cls.get_bookings(user_id)
        content = ICalendarSerializer.serialize(bookings)
        etag = f'"{hashlib.sha256(content).hexdigest()}"'
        last_modified = max(
            (booking.updated_at for booking in bookings),
            default=None,
        )
        return CalendarFeed(
            content=content,
            etag=etag,
            last_modified=last_modified,
        )


class ICalendarSerializer:
    _calendar_timezone = ZoneInfo("Asia/Seoul")

    @classmethod
    def serialize(cls, bookings: list[Booking]) -> bytes:
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//B201//Reservation Calendar//KO",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:B201 예약",
            f"X-PUBLISHED-TTL:{CALENDAR_REFRESH_INTERVAL}",
            f"REFRESH-INTERVAL;VALUE=DURATION:{CALENDAR_REFRESH_INTERVAL}",
        ]
        for booking in bookings:
            lines.extend(cls._event_lines(booking))
        lines.append("END:VCALENDAR")

        folded_lines = [folded for line in lines for folded in cls._fold_line(line)]
        return ("\r\n".join(folded_lines) + "\r\n").encode("utf-8")

    @classmethod
    def _event_lines(cls, booking: Booking) -> list[str]:
        start = cls._to_utc(booking.reservation_date, booking.start_time)
        end = cls._to_utc(booking.reservation_date, booking.end_time)
        updated_at = booking.updated_at.astimezone(datetime_timezone.utc)
        summary = booking.title or (
            f"{booking.team.name} 예약"
            if booking.booking_type == BookingType.TEAM and booking.team
            else "B201 개인 예약"
        )
        status = (
            "CANCELLED"
            if booking.status in [BookingStatus.CANCELED, BookingStatus.REJECTED]
            else "CONFIRMED"
        )

        return [
            "BEGIN:VEVENT",
            f"UID:reservation-{booking.reservation_number}@b201.kr",
            f"DTSTAMP:{cls._format_utc(updated_at)}",
            f"LAST-MODIFIED:{cls._format_utc(updated_at)}",
            f"SEQUENCE:{int(updated_at.timestamp())}",
            f"DTSTART:{cls._format_utc(start)}",
            f"DTEND:{cls._format_utc(end)}",
            f"SUMMARY:{cls._escape_text(summary)}",
            f"LOCATION:{cls._escape_text(booking.room.name)}",
            f"STATUS:{status}",
            "END:VEVENT",
        ]

    @classmethod
    def _to_utc(cls, reservation_date, reservation_time) -> datetime:
        local_datetime = datetime.combine(
            reservation_date,
            reservation_time,
            tzinfo=cls._calendar_timezone,
        )
        return local_datetime.astimezone(datetime_timezone.utc)

    @staticmethod
    def _format_utc(value: datetime) -> str:
        return value.strftime("%Y%m%dT%H%M%SZ")

    @staticmethod
    def _escape_text(value: str) -> str:
        return (
            value.replace("\\", "\\\\")
            .replace("\r\n", "\\n")
            .replace("\n", "\\n")
            .replace("\r", "\\n")
            .replace(";", "\\;")
            .replace(",", "\\,")
        )

    @staticmethod
    def _fold_line(line: str) -> list[str]:
        folded: list[str] = []
        current = ""
        byte_limit = 75

        for character in line:
            candidate = current + character
            if len(candidate.encode("utf-8")) > byte_limit:
                folded.append(current)
                current = " " + character
            else:
                current = candidate

        folded.append(current)
        return folded
