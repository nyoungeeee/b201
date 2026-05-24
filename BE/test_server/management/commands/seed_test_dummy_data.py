import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Iterable

from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction
from django.utils import timezone

from accounts.models import User, UserStatus
from auth_tokens.services import TokenRefreshService
from bookings.exceptions import BookingCheckServiceError
from bookings.models import Booking, BookingStatus, BookingType
from bookings.services import ReservationCommandService
from studios.models import ClosureType, RoomClosure, StudioRoom, StudioRoomStatus
from teams.models import (
    Team,
    TeamColor,
    TeamMember,
    TeamMemberRole,
    TeamMemberStatus,
    TeamStatus,
)

USER_COUNT = 100
TEAM_COUNT = 10
TEAM_MEMBER_USER_COUNT = 33
START_DATE = date(2026, 6, 1)
END_DATE = date(2026, 12, 31)
DEFAULT_SEED = 260624
SEED_EMAIL_DOMAIN = "seed.b201.local"
SEED_CLOSURE_PREFIX = "[seed26]"

ROOM_BLUEPRINTS = [
    {
        "name": "b201",
        "description": "test seed normal room",
        "open_time": time(9, 0),
        "close_time": time(22, 0),
        "is_24_hours": False,
        "sort_order": 1,
    },
    {
        "name": "b202",
        "description": "test seed overnight room",
        "open_time": time(10, 0),
        "close_time": time(3, 0),
        "is_24_hours": False,
        "sort_order": 2,
    },
    {
        "name": "b203",
        "description": "test seed 24-hour room",
        "open_time": time(9, 0),
        "close_time": time(9, 0),
        "is_24_hours": True,
        "sort_order": 3,
    },
    {
        "name": "b204",
        "description": "test seed compact room",
        "open_time": time(12, 0),
        "close_time": time(20, 0),
        "is_24_hours": False,
        "sort_order": 4,
    },
]

TEAM_COLORS = [
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

TEAM_THEME_POOL = [
    {
        "team_name": "미세스 레드애플",
        "member_names": [
            "오모이오토키",
            "사과비트",
            "붉은멜로",
            "유자사운드",
            "하모니카",
        ],
    },
    {
        "team_name": "실리카젤리",
        "member_names": ["젤리빈", "유리파도", "말랑광선", "은빛소다", "투명리듬"],
    },
    {
        "team_name": "브로콜리 너머조",
        "member_names": ["초록밤", "잔잔콩", "새벽수프", "감성잎", "포근가지"],
    },
    {
        "team_name": "새소년단",
        "member_names": ["파란새벽", "하늘결", "소년결", "유영별", "청춘파형"],
    },
    {
        "team_name": "유다빈밴딧",
        "member_names": ["다빈무드", "푸른빈", "반짝온", "온기야", "무드송"],
    },
    {
        "team_name": "데이브레이커스",
        "member_names": ["여명톤", "새벽결", "브리즈윤", "빛결이", "아침파동"],
    },
    {
        "team_name": "혁오차",
        "member_names": ["오차율", "온도혁", "흐린감", "몽환차", "무심파"],
    },
    {
        "team_name": "잔나비행",
        "member_names": ["비행몽", "노을잔", "감성비", "유영나", "낭만결"],
    },
    {
        "team_name": "루시드폴라",
        "member_names": ["별폴", "루시드림", "밤산책", "포근별", "달결음"],
    },
    {
        "team_name": "오월오일",
        "member_names": ["오월빛", "다섯밤", "봄숨", "한낮이", "초여름"],
    },
    {
        "team_name": "멜로망수",
        "member_names": ["멜로우", "망고수", "달콤숨", "포근송", "수수멜"],
    },
    {
        "team_name": "검정치맛자국",
        "member_names": ["먹먹밤", "잔흔별", "검은리본", "무드블랙", "스모키결"],
    },
]

SOLO_NICKNAME_POOL = [
    "보들",
    "다몽",
    "윤슬",
    "도담",
    "마루",
    "나린",
    "하랑",
    "소미",
    "가온",
    "라비",
    "해나",
    "수호",
    "다온",
    "온유",
    "시안",
    "하민",
    "로아",
    "소율",
    "유담",
    "서하",
    "이솔",
    "다솜",
    "여울",
    "노을",
    "하음",
    "지안",
    "은결",
    "루다",
    "주안",
    "하루",
    "아라",
    "연우",
    "태이",
    "은호",
    "도이",
    "시율",
    "서온",
    "규리",
    "하엘",
    "유설",
    "아윤",
    "세온",
    "지율",
    "민하",
    "라온",
    "도은",
    "하린",
    "은비",
    "유하",
    "채온",
    "예담",
    "수안",
    "지호",
    "다빈",
    "현유",
    "서윤",
    "하연",
    "도경",
    "은서",
    "재이",
    "소담",
    "별하",
    "온별",
    "다별",
    "해봄",
    "루미",
    "은솔",
    "하솔",
    "유온",
    "시아",
    "연담",
    "이든",
    "단비",
    "모아",
    "시온",
    "주연",
    "해원",
    "소은",
    "태온",
    "다해",
]


@dataclass
class SeedUser:
    id: int
    nickname: str
    is_staff: bool
    access_token: str = ""
    refresh_token: str = ""


@dataclass
class SeedTeam:
    id: int
    name: str
    owner: SeedUser
    members: list[SeedUser]


@dataclass
class PlannedTeam:
    name: str
    member_names: list[str]
    color: str


@dataclass
class CreatedReservation:
    reservation_number: int
    creator: SeedUser
    room_id: int
    reservation_date: date
    start_time: time
    end_time: time


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise CommandError(f"invalid date: {value}. Use YYYY-MM-DD.") from exc


def daterange(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def normalize_team_color(color: str) -> str:
    return color.strip().lstrip("#").upper()


def build_unique_names(pool: list[str], count: int, rng: random.Random) -> list[str]:
    generated: list[str] = []
    used_names: set[str] = set()
    shuffled_pool = pool[:]
    rng.shuffle(shuffled_pool)

    base_index = 0
    while len(generated) < count:
        base_name = shuffled_pool[base_index % len(shuffled_pool)]
        base_index += 1

        if base_name not in used_names:
            generated.append(base_name)
            used_names.add(base_name)
            continue

        suffix = 2
        while True:
            candidate = f"{base_name}{suffix:02d}"
            if candidate not in used_names:
                generated.append(candidate)
                used_names.add(candidate)
                break
            suffix += 1

    return generated


def build_team_sizes(
    total_members: int,
    team_count: int,
    max_size: int,
    rng: random.Random,
) -> list[int]:
    sizes = [1] * team_count
    remaining = total_members - team_count

    while remaining > 0:
        candidates = [index for index, size in enumerate(sizes) if size < max_size]
        sizes[rng.choice(candidates)] += 1
        remaining -= 1

    rng.shuffle(sizes)
    return sizes


def build_seed_plan(
    user_count: int,
    team_count: int,
    team_member_user_count: int,
    rng: random.Random,
) -> tuple[list[str], list[PlannedTeam]]:
    if team_count < 1:
        raise CommandError("team-count must be at least 1.")
    if user_count < team_member_user_count:
        raise CommandError(
            "user-count must be greater than or equal to team-member-count."
        )
    if team_member_user_count < team_count:
        raise CommandError(
            "team-member-count must be greater than or equal to team-count."
        )

    themes = TEAM_THEME_POOL[:]
    rng.shuffle(themes)
    selected_themes = themes[:team_count]
    if len(selected_themes) < team_count:
        raise CommandError(f"team-count cannot exceed {len(TEAM_THEME_POOL)}.")

    team_sizes = build_team_sizes(
        total_members=team_member_user_count,
        team_count=team_count,
        max_size=10,
        rng=rng,
    )

    planned_user_names: list[str] = []
    planned_teams: list[PlannedTeam] = []
    for index, theme in enumerate(selected_themes):
        member_names = build_unique_names(
            pool=theme["member_names"],
            count=team_sizes[index],
            rng=rng,
        )
        planned_teams.append(
            PlannedTeam(
                name=theme["team_name"],
                member_names=member_names,
                color=TEAM_COLORS[index % len(TEAM_COLORS)],
            )
        )
        planned_user_names.extend(member_names)

    planned_user_names.extend(
        build_unique_names(
            pool=SOLO_NICKNAME_POOL,
            count=user_count - len(planned_user_names),
            rng=rng,
        )
    )
    return planned_user_names, planned_teams


def next_kakao_id() -> int:
    max_kakao_id = User.objects.aggregate(max_kakao_id=models.Max("kakao_id"))[
        "max_kakao_id"
    ]
    return int(max_kakao_id or 0) + 1


def ensure_seed_users(nicknames: list[str]) -> list[SeedUser]:
    seed_users: list[SeedUser] = []

    for index, nickname in enumerate(nicknames, start=1):
        is_staff = index <= 6
        user = User.objects.filter(nickname=nickname).first()
        if user is None:
            user = User.objects.create_user(
                kakao_id=next_kakao_id(),
                email=f"seed-{index:03d}@{SEED_EMAIL_DOMAIN}",
                nickname=nickname,
                is_staff=is_staff,
                status=UserStatus.ACTIVE,
            )
        else:
            fields_to_update: list[str] = []
            if not user.is_active:
                user.is_active = True
                fields_to_update.append("is_active")
            if user.status != UserStatus.ACTIVE:
                user.status = UserStatus.ACTIVE
                fields_to_update.append("status")
            if user.is_staff != is_staff:
                user.is_staff = is_staff
                fields_to_update.append("is_staff")
            if fields_to_update:
                fields_to_update.append("updated_at")
                user.save(update_fields=fields_to_update)

        token_status = TokenRefreshService.generate_tokens(user)
        seed_users.append(
            SeedUser(
                id=user.id,
                nickname=user.nickname,
                is_staff=user.is_staff,
                access_token=token_status.access,
                refresh_token=token_status.refresh,
            )
        )

    return seed_users


def ensure_team_colors(planned_teams: list[PlannedTeam]) -> None:
    existing_count = TeamColor.objects.count()
    seed_colors = [normalize_team_color(color) for color in TEAM_COLORS]
    planned_colors = [normalize_team_color(team.color) for team in planned_teams]
    invalid_colors = sorted(set(planned_colors) - set(seed_colors))
    if invalid_colors:
        raise CommandError(f"invalid planned team colors: {invalid_colors}")

    for index, color in enumerate(dict.fromkeys(seed_colors)):
        TeamColor.objects.get_or_create(
            color=color,
            defaults={"display_order": existing_count + index, "is_active": True},
        )


def assign_team_color(team: Team, color: str) -> None:
    normalized_color = normalize_team_color(color)
    team_color = TeamColor.objects.select_for_update().get(
        color=normalized_color,
        is_active=True,
    )
    TeamColor.objects.select_for_update().filter(team=team).exclude(
        id=team_color.id
    ).update(team=None)
    if team_color.team_id != team.id:
        team_color.team = team
        team_color.save(update_fields=["team"])


def ensure_seed_teams(
    seed_users: list[SeedUser],
    planned_teams: list[PlannedTeam],
    team_member_user_count: int,
) -> list[SeedTeam]:
    assigned_users = seed_users[:team_member_user_count]
    created_teams: list[SeedTeam] = []
    cursor = 0

    with transaction.atomic():
        ensure_team_colors(planned_teams=planned_teams)

        for planned_team in planned_teams:
            team_size = len(planned_team.member_names)
            members = assigned_users[cursor : cursor + team_size]
            cursor += team_size
            owner = members[0]

            team, _ = Team.objects.get_or_create(
                name=planned_team.name,
                defaults={"owner_id": owner.id, "status": TeamStatus.ACTIVE},
            )

            fields_to_update: list[str] = []
            if team.owner_id != owner.id:
                team.owner_id = owner.id
                fields_to_update.append("owner")
            if team.status != TeamStatus.ACTIVE:
                team.status = TeamStatus.ACTIVE
                fields_to_update.append("status")
            if fields_to_update:
                fields_to_update.append("updated_at")
                team.save(update_fields=fields_to_update)

            assign_team_color(team=team, color=planned_team.color)

            for member_index, member in enumerate(members):
                target_role = (
                    TeamMemberRole.LEADER
                    if member_index == 0
                    else TeamMemberRole.MEMBER
                )
                membership, _ = TeamMember.objects.get_or_create(
                    team=team,
                    user_id=member.id,
                    defaults={
                        "role": target_role,
                        "status": TeamMemberStatus.ACTIVE,
                    },
                )
                membership_fields: list[str] = []
                if membership.role != target_role:
                    membership.role = target_role
                    membership_fields.append("role")
                if membership.status != TeamMemberStatus.ACTIVE:
                    membership.status = TeamMemberStatus.ACTIVE
                    membership_fields.append("status")
                if membership_fields:
                    membership.save(update_fields=membership_fields)

            created_teams.append(
                SeedTeam(id=team.id, name=team.name, owner=owner, members=members)
            )

    return created_teams


def ensure_rooms() -> list[StudioRoom]:
    for blueprint in ROOM_BLUEPRINTS:
        room, created = StudioRoom.objects.get_or_create(
            name=blueprint["name"],
            defaults={
                "description": blueprint["description"],
                "open_time": blueprint["open_time"],
                "close_time": blueprint["close_time"],
                "is_24_hours": blueprint["is_24_hours"],
                "status": StudioRoomStatus.ACTIVE,
                "sort_order": blueprint["sort_order"],
            },
        )
        if not created:
            room.description = blueprint["description"]
            room.open_time = blueprint["open_time"]
            room.close_time = blueprint["close_time"]
            room.is_24_hours = blueprint["is_24_hours"]
            room.status = StudioRoomStatus.ACTIVE
            room.sort_order = blueprint["sort_order"]
            room.save(
                update_fields=[
                    "description",
                    "open_time",
                    "close_time",
                    "is_24_hours",
                    "status",
                    "sort_order",
                    "updated_at",
                ]
            )

    return list(
        StudioRoom.objects.filter(status=StudioRoomStatus.ACTIVE).order_by(
            "sort_order", "id"
        )
    )


def time_range_to_slot_range(
    room: StudioRoom,
    target_date: date,
    start_time: time,
    end_time: time,
) -> range:
    open_at = ReservationCommandService._get_room_open_datetime(room, target_date)
    start_at = ReservationCommandService._normalize_time(room, target_date, start_time)
    end_at = ReservationCommandService._normalize_end_time(
        room,
        target_date,
        start_time,
        end_time,
    )
    start_index = int((start_at - open_at).total_seconds() // 1800)
    end_index = int((end_at - open_at).total_seconds() // 1800)
    return range(start_index, end_index)


def build_occupied_slot_map(
    rooms: list[StudioRoom],
    start_date: date,
    end_date: date,
) -> dict[tuple[int, date], set[int]]:
    occupied: dict[tuple[int, date], set[int]] = defaultdict(set)
    room_map = {room.id: room for room in rooms}

    bookings = Booking.objects.filter(
        room_id__in=room_map.keys(),
        reservation_date__gte=start_date,
        reservation_date__lte=end_date,
        status__in=[BookingStatus.PENDING, BookingStatus.RESERVED],
    )
    for booking in bookings:
        room = room_map[booking.room_id]
        occupied[(room.id, booking.reservation_date)].update(
            time_range_to_slot_range(
                room,
                booking.reservation_date,
                booking.start_time,
                booking.end_time,
            )
        )

    closures = RoomClosure.objects.filter(
        room_id__in=room_map.keys(),
        closure_date__gte=start_date,
        closure_date__lte=end_date,
    )
    for closure in closures:
        room = room_map[closure.room_id]
        occupied[(room.id, closure.closure_date)].update(
            time_range_to_slot_range(
                room,
                closure.closure_date,
                closure.start_time or room.open_time,
                closure.end_time or room.close_time,
            )
        )

    return occupied


def find_available_start_indices(
    room: StudioRoom,
    target_date: date,
    duration_slots: int,
    occupied_slots: set[int],
) -> list[int]:
    open_at = ReservationCommandService._get_room_open_datetime(room, target_date)
    close_at = ReservationCommandService._get_room_close_datetime(room, target_date)
    total_slots = int((close_at - open_at).total_seconds() // 1800)

    return [
        start_index
        for start_index in range(0, total_slots - duration_slots + 1)
        if all(
            slot_index not in occupied_slots
            for slot_index in range(start_index, start_index + duration_slots)
        )
    ]


def slot_index_to_time(room: StudioRoom, target_date: date, slot_index: int) -> time:
    open_at = ReservationCommandService._get_room_open_datetime(room, target_date)
    return (open_at + timedelta(minutes=30 * slot_index)).time()


def weighted_daily_booking_count(rng: random.Random) -> int:
    choices = [1] * 15 + [2] * 24 + [3] * 28 + [4] * 16 + [5] * 9 + [6] * 4
    return rng.choice(choices)


def weighted_duration_slots(rng: random.Random) -> int:
    return rng.choice([1] * 10 + [2] * 30 + [3] * 20 + [4] * 22 + [5] * 10 + [6] * 8)


def find_slot_for_room(
    room: StudioRoom,
    target_date: date,
    occupied_slots: set[int],
    rng: random.Random,
) -> tuple[time, time] | None:
    for _ in range(20):
        duration_slots = weighted_duration_slots(rng)
        candidates = find_available_start_indices(
            room=room,
            target_date=target_date,
            duration_slots=duration_slots,
            occupied_slots=occupied_slots,
        )
        if not candidates:
            continue

        start_index = rng.choice(candidates)
        end_index = start_index + duration_slots
        return (
            slot_index_to_time(room, target_date, start_index),
            slot_index_to_time(room, target_date, end_index),
        )

    return None


def ensure_room_closures(
    rooms: list[StudioRoom],
    occupied_slots: dict[tuple[int, date], set[int]],
    start_date: date,
    end_date: date,
    rng: random.Random,
) -> int:
    created_count = 0
    target_full_day = min(8, len(rooms) * 2)
    target_partial = max(12, len(rooms) * 4)

    for closure_index in range(1, target_full_day + 1):
        for _ in range(40):
            room = rng.choice(rooms)
            target_date = start_date + timedelta(
                days=rng.randint(0, (end_date - start_date).days)
            )
            key = (room.id, target_date)
            if occupied_slots[key]:
                continue

            closure_type = (
                ClosureType.HOLIDAY
                if closure_index % 2 == 0
                else ClosureType.MAINTENANCE
            )
            is_holiday = closure_type == ClosureType.HOLIDAY
            closure, created = RoomClosure.objects.get_or_create(
                room=room,
                closure_date=target_date,
                start_time=None if is_holiday else room.open_time,
                end_time=None if is_holiday else room.close_time,
                defaults={
                    "start_date": target_date,
                    "end_date": target_date,
                    "is_all_day": True,
                    "closure_type": closure_type,
                    "reason": f"{SEED_CLOSURE_PREFIX} full-day {closure_type.lower()} #{closure_index}",
                },
            )
            if created:
                created_count += 1
                occupied_slots[key].update(
                    time_range_to_slot_range(
                        room,
                        target_date,
                        room.open_time,
                        room.close_time,
                    )
                )
            break

    for closure_index in range(1, target_partial + 1):
        for _ in range(50):
            room = rng.choice(rooms)
            target_date = start_date + timedelta(
                days=rng.randint(0, (end_date - start_date).days)
            )
            key = (room.id, target_date)
            duration_slots = rng.choice([2, 3, 4, 5, 6])
            candidates = find_available_start_indices(
                room=room,
                target_date=target_date,
                duration_slots=duration_slots,
                occupied_slots=occupied_slots[key],
            )
            if not candidates:
                continue

            start_index = rng.choice(candidates)
            end_index = start_index + duration_slots
            start_time = slot_index_to_time(room, target_date, start_index)
            end_time = slot_index_to_time(room, target_date, end_index)

            closure, created = RoomClosure.objects.get_or_create(
                room=room,
                closure_date=target_date,
                start_time=start_time,
                end_time=end_time,
                defaults={
                    "start_date": target_date,
                    "end_date": target_date,
                    "is_all_day": False,
                    "closure_type": rng.choice(
                        [
                            ClosureType.BLOCKED,
                            ClosureType.MAINTENANCE,
                        ]
                    ),
                    "reason": f"{SEED_CLOSURE_PREFIX} partial closure #{closure_index}",
                },
            )
            if created:
                created_count += 1
                occupied_slots[key].update(range(start_index, end_index))
            break

    return created_count


def booking_exists(
    room_id: int,
    reservation_date: date,
    start_time: time,
    end_time: time,
    booking_type: str,
    user_id: int,
    team_id: int | None = None,
) -> bool:
    queryset = Booking.objects.filter(
        room_id=room_id,
        reservation_date=reservation_date,
        start_time=start_time,
        end_time=end_time,
        booking_type=booking_type,
        user_id=user_id,
    )
    if team_id is None:
        queryset = queryset.filter(team__isnull=True)
    else:
        queryset = queryset.filter(team_id=team_id)
    return queryset.exists()


def create_private_reservation(
    creator: SeedUser,
    room_id: int,
    target_date: date,
    start_time: time,
    end_time: time,
    count: int = 1,
):
    user = User.objects.get(id=creator.id)
    return ReservationCommandService.create_private_reservation(
        user=user,
        room_id=room_id,
        start_date=target_date,
        count=count,
        start_time=start_time,
        end_time=end_time,
    )


def create_team_reservation(
    creator: SeedUser,
    room_id: int,
    team_id: int,
    target_date: date,
    start_time: time,
    end_time: time,
    count: int = 1,
):
    user = User.objects.get(id=creator.id)
    return ReservationCommandService.create_team_reservation(
        user=user,
        room_id=room_id,
        team_id=team_id,
        start_date=target_date,
        count=count,
        start_time=start_time,
        end_time=end_time,
    )


def create_reservations(
    rooms: list[StudioRoom],
    users: list[SeedUser],
    teams: list[SeedTeam],
    occupied_slots: dict[tuple[int, date], set[int]],
    start_date: date,
    end_date: date,
    rng: random.Random,
) -> list[CreatedReservation]:
    created_records: list[CreatedReservation] = []

    for target_date in daterange(start_date, end_date):
        for _ in range(weighted_daily_booking_count(rng)):
            for _ in range(60):
                room = rng.choice(rooms)
                key = (room.id, target_date)
                time_pair = find_slot_for_room(
                    room=room,
                    target_date=target_date,
                    occupied_slots=occupied_slots[key],
                    rng=rng,
                )
                if time_pair is None:
                    continue

                start_time, end_time = time_pair
                use_team_booking = bool(teams) and rng.random() < 0.35

                try:
                    if use_team_booking:
                        team = rng.choice(teams)
                        creator = rng.choice(team.members)
                        if booking_exists(
                            room_id=room.id,
                            reservation_date=target_date,
                            start_time=start_time,
                            end_time=end_time,
                            booking_type=BookingType.TEAM,
                            user_id=creator.id,
                            team_id=team.id,
                        ):
                            break
                        reservation_list = create_team_reservation(
                            creator=creator,
                            room_id=room.id,
                            team_id=team.id,
                            target_date=target_date,
                            start_time=start_time,
                            end_time=end_time,
                        )
                    else:
                        creator = rng.choice(users)
                        if booking_exists(
                            room_id=room.id,
                            reservation_date=target_date,
                            start_time=start_time,
                            end_time=end_time,
                            booking_type=BookingType.PRIVATE,
                            user_id=creator.id,
                        ):
                            break
                        reservation_list = create_private_reservation(
                            creator=creator,
                            room_id=room.id,
                            target_date=target_date,
                            start_time=start_time,
                            end_time=end_time,
                        )
                except BookingCheckServiceError:
                    continue

                reservation = reservation_list.reservations[0]
                occupied_slots[key].update(
                    time_range_to_slot_range(room, target_date, start_time, end_time)
                )
                created_records.append(
                    CreatedReservation(
                        reservation_number=reservation.reservation_number,
                        creator=creator,
                        room_id=room.id,
                        reservation_date=target_date,
                        start_time=start_time,
                        end_time=end_time,
                    )
                )
                break

    return created_records


def create_recurring_reservations(
    rooms: list[StudioRoom],
    users: list[SeedUser],
    teams: list[SeedTeam],
    occupied_slots: dict[tuple[int, date], set[int]],
    start_date: date,
    end_date: date,
    rng: random.Random,
) -> list[CreatedReservation]:
    created_records: list[CreatedReservation] = []

    for _ in range(18):
        room = rng.choice(rooms)
        first_date = start_date + timedelta(days=rng.randint(0, 120))
        count = rng.randint(2, 4)
        target_dates = [
            first_date + timedelta(days=7 * index) for index in range(count)
        ]
        if target_dates[-1] > end_date:
            continue

        selected_times: tuple[time, time] | None = None
        for _ in range(25):
            slot = find_slot_for_room(
                room=room,
                target_date=first_date,
                occupied_slots=occupied_slots[(room.id, first_date)],
                rng=rng,
            )
            if slot is None:
                break
            start_time, end_time = slot
            if all(
                not any(
                    slot_index in occupied_slots[(room.id, recurring_date)]
                    for slot_index in time_range_to_slot_range(
                        room,
                        recurring_date,
                        start_time,
                        end_time,
                    )
                )
                for recurring_date in target_dates
            ):
                selected_times = (start_time, end_time)
                break
        if selected_times is None:
            continue

        start_time, end_time = selected_times
        creator_team = rng.choice(teams) if teams and rng.random() < 0.4 else None
        creator = (
            rng.choice(creator_team.members) if creator_team else rng.choice(users)
        )

        try:
            if creator_team:
                reservation_list = create_team_reservation(
                    creator=creator,
                    room_id=room.id,
                    team_id=creator_team.id,
                    target_date=first_date,
                    start_time=start_time,
                    end_time=end_time,
                    count=count,
                )
            else:
                reservation_list = create_private_reservation(
                    creator=creator,
                    room_id=room.id,
                    target_date=first_date,
                    start_time=start_time,
                    end_time=end_time,
                    count=count,
                )
        except BookingCheckServiceError:
            continue

        for reservation in reservation_list.reservations:
            occupied_slots[(room.id, reservation.date)].update(
                time_range_to_slot_range(
                    room,
                    reservation.date,
                    start_time,
                    end_time,
                )
            )
            created_records.append(
                CreatedReservation(
                    reservation_number=reservation.reservation_number,
                    creator=creator,
                    room_id=room.id,
                    reservation_date=reservation.date,
                    start_time=start_time,
                    end_time=end_time,
                )
            )

    return created_records


def apply_status_mix(
    created_records: list[CreatedReservation],
    rng: random.Random,
) -> tuple[int, int, int]:
    if not created_records:
        return 0, 0, 0

    shuffled_records = created_records[:]
    rng.shuffle(shuffled_records)
    cancel_count = int(len(shuffled_records) * 0.10)
    reserve_count = int(len(shuffled_records) * 0.58)
    canceled_numbers: list[int] = []

    for record in shuffled_records[:cancel_count]:
        try:
            user = User.objects.get(id=record.creator.id)
            ReservationCommandService.cancel_reservation(
                user=user,
                reservation_number=record.reservation_number,
            )
            canceled_numbers.append(record.reservation_number)
        except BookingCheckServiceError:
            continue

    cancel_set = set(canceled_numbers)
    reserved_numbers = [
        record.reservation_number
        for record in shuffled_records[cancel_count : cancel_count + reserve_count]
        if record.reservation_number not in cancel_set
    ]
    if reserved_numbers:
        Booking.objects.filter(
            reservation_number__in=reserved_numbers,
            status=BookingStatus.PENDING,
        ).update(status=BookingStatus.RESERVED, updated_at=timezone.now())

    pending_count = Booking.objects.filter(
        reservation_number__in=[
            record.reservation_number for record in created_records
        ],
        status=BookingStatus.PENDING,
    ).count()
    return len(reserved_numbers), len(canceled_numbers), pending_count


class Command(BaseCommand):
    help = "Seed test users, teams, rooms, closures, and reservations for local/dev testing."

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
        parser.add_argument("--user-count", type=int, default=USER_COUNT)
        parser.add_argument("--team-count", type=int, default=TEAM_COUNT)
        parser.add_argument(
            "--team-member-count",
            type=int,
            default=TEAM_MEMBER_USER_COUNT,
            help="How many seeded users are distributed into teams.",
        )
        parser.add_argument("--start-date", default=START_DATE.isoformat())
        parser.add_argument("--end-date", default=END_DATE.isoformat())
        parser.add_argument(
            "--skip-reservations",
            action="store_true",
            help="Only seed users, teams, rooms, and closures.",
        )

    def handle(self, *args, **options):
        start_date = parse_iso_date(options["start_date"])
        end_date = parse_iso_date(options["end_date"])
        if start_date > end_date:
            raise CommandError("start-date must be earlier than or equal to end-date.")

        rng = random.Random(options["seed"])
        planned_user_names, planned_teams = build_seed_plan(
            user_count=options["user_count"],
            team_count=options["team_count"],
            team_member_user_count=options["team_member_count"],
            rng=rng,
        )

        seed_users = ensure_seed_users(nicknames=planned_user_names)
        seed_teams = ensure_seed_teams(
            seed_users=seed_users,
            planned_teams=planned_teams,
            team_member_user_count=options["team_member_count"],
        )
        rooms = ensure_rooms()
        occupied_slots = build_occupied_slot_map(
            rooms=rooms,
            start_date=start_date,
            end_date=end_date,
        )
        closure_count = ensure_room_closures(
            rooms=rooms,
            occupied_slots=occupied_slots,
            start_date=start_date,
            end_date=end_date,
            rng=rng,
        )

        created_records: list[CreatedReservation] = []
        reserved_count = 0
        canceled_count = 0
        pending_count = 0

        if not options["skip_reservations"]:
            created_records = create_reservations(
                rooms=rooms,
                users=seed_users,
                teams=seed_teams,
                occupied_slots=occupied_slots,
                start_date=start_date,
                end_date=end_date,
                rng=rng,
            )
            created_records.extend(
                create_recurring_reservations(
                    rooms=rooms,
                    users=seed_users,
                    teams=seed_teams,
                    occupied_slots=occupied_slots,
                    start_date=start_date,
                    end_date=end_date,
                    rng=rng,
                )
            )
            reserved_count, canceled_count, pending_count = apply_status_mix(
                created_records=created_records,
                rng=rng,
            )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed completed"))
        self.stdout.write(f"- users ensured: {len(seed_users)}")
        self.stdout.write(f"- teams ensured: {len(seed_teams)}")
        self.stdout.write(f"- active rooms used: {len(rooms)}")
        self.stdout.write(f"- closures created this run: {closure_count}")
        self.stdout.write(f"- reservations created this run: {len(created_records)}")
        self.stdout.write(f"- reserved this run: {reserved_count}")
        self.stdout.write(f"- canceled this run: {canceled_count}")
        self.stdout.write(f"- pending left from this run: {pending_count}")

        admin_user = next((user for user in seed_users if user.is_staff), None)
        normal_user = next((user for user in seed_users if not user.is_staff), None)
        if admin_user:
            self.stdout.write("")
            self.stdout.write("Sample admin token")
            self.stdout.write(f"- nickname: {admin_user.nickname}")
            self.stdout.write(f"- access: {admin_user.access_token}")
        if normal_user:
            self.stdout.write("")
            self.stdout.write("Sample member token")
            self.stdout.write(f"- nickname: {normal_user.nickname}")
            self.stdout.write(f"- access: {normal_user.access_token}")

        self.stdout.write("")
        self.stdout.write("Team sizes")
        for seed_team in seed_teams:
            self.stdout.write(f"- {seed_team.name}: {len(seed_team.members)} members")
