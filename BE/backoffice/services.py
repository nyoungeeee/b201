from dataclasses import dataclass
from datetime import datetime, timedelta
import base64
import math

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count, Max, Q
from django.utils import timezone

from accounts.models import UserStatus
from backoffice.models import AdminActionLog
from bookings.models import Booking, BookingStatus, BookingType
from studios.models import ClosureType, RoomClosure, StudioRoom, StudioRoomStatus
from teams.models import (
    Team,
    TeamColor,
    TeamMember,
    TeamMemberRole,
    TeamMemberStatus,
    TeamStatus,
)

User = get_user_model()


def build_pagination(page: int, page_size: int, total_count: int) -> dict[str, int]:
    return {
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": math.ceil(total_count / page_size) if total_count else 0,
    }


@dataclass
class AdminUserInfo:
    id: int
    nickname: str | None
    email: str | None
    status: str
    joined_at: object
    team_ids: list[int]


@dataclass
class AdminUserList:
    users: list[AdminUserInfo]
    pagination: dict[str, int]


class AdminUserService:
    @staticmethod
    def get_users(
        q: str | None,
        team_id: int | None,
        status: str,
        page: int,
        page_size: int,
    ) -> AdminUserList:
        queryset = User.objects.exclude(status=UserStatus.WITHDRAWN).order_by(
            "-created_at", "-id"
        )

        if q:
            queryset = queryset.filter(Q(nickname__icontains=q) | Q(email__icontains=q))

        if team_id is not None:
            queryset = queryset.filter(
                team_memberships__team_id=team_id,
                team_memberships__status=TeamMemberStatus.ACTIVE,
                team_memberships__team__status=TeamStatus.ACTIVE,
            )

        if status == "normal":
            queryset = queryset.filter(status=UserStatus.ACTIVE)
        elif status == "blocked":
            queryset = queryset.filter(status=UserStatus.BLOCKED)

        queryset = queryset.distinct()
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        users = list(queryset[start:end])

        return AdminUserList(
            users=[AdminUserService._build_user_info(user) for user in users],
            pagination=build_pagination(
                page=page,
                page_size=page_size,
                total_count=total_count,
            ),
        )

    @staticmethod
    def get_user(user_id: int) -> AdminUserInfo:
        return AdminUserService._build_user_info(AdminUserService._get_user(user_id))

    @staticmethod
    def block_user(user_id: int) -> bool:
        user = AdminUserService._get_user(user_id)
        if user.status == UserStatus.BLOCKED:
            return False
        user.status = UserStatus.BLOCKED
        user.save(update_fields=["status", "updated_at"])
        return True

    @staticmethod
    def unblock_user(user_id: int) -> bool:
        user = AdminUserService._get_user(user_id)
        if user.status != UserStatus.BLOCKED:
            return False
        user.status = UserStatus.ACTIVE
        user.save(update_fields=["status", "updated_at"])
        return True

    @staticmethod
    def _get_user(user_id: int):
        return User.objects.get(id=user_id, is_active=True)

    @staticmethod
    def _build_user_info(user) -> AdminUserInfo:
        return AdminUserInfo(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            status=AdminUserService._map_status(user.status),
            joined_at=user.created_at.date(),
            team_ids=list(
                user.team_memberships.filter(
                    status=TeamMemberStatus.ACTIVE,
                    team__status=TeamStatus.ACTIVE,
                ).values_list("team_id", flat=True)
            ),
        )

    @staticmethod
    def _map_status(user_status: str) -> str:
        if user_status == UserStatus.BLOCKED:
            return "blocked"
        return "normal"


@dataclass
class AdminTeamInfo:
    id: int
    name: str
    color_id: int | None
    color_value: str | None
    leader_id: int
    leader_nickname: str | None
    member_count: int
    updated_at: object


@dataclass
class AdminTeamMemberInfo:
    id: int
    nickname: str | None
    email: str | None
    status: str
    is_leader: bool


@dataclass
class AdminTeamDetail(AdminTeamInfo):
    member_ids: list[int]
    members: list[AdminTeamMemberInfo]


@dataclass
class AdminTeamList:
    teams: list[AdminTeamInfo]
    pagination: dict[str, int]


@dataclass
class AdminTeamColorInfo:
    id: int
    name: str
    value: str
    available: bool


@dataclass
class AdminTeamMemberAddResult:
    added_user_ids: list[int]
    member_ids: list[int]


@dataclass
class AdminTeamLeaderResult:
    leader_id: int
    leader_nickname: str | None


class DuplicateTeamNameError(Exception):
    pass


class ColorUnavailableError(Exception):
    pass


class BlockedUserIncludedError(Exception):
    pass


class NotTeamMemberError(Exception):
    pass


class DuplicateRoomNameError(Exception):
    pass


class AlreadyApprovedError(Exception):
    pass


class ConflictReservationError(Exception):
    pass


class RoomInactiveError(Exception):
    pass


class NotRepeatReservationError(Exception):
    pass


class ReservationConflictError(Exception):
    def __init__(self, conflicts):
        self.conflicts = conflicts


class AdminTeamService:
    @staticmethod
    def get_colors(team_id: int | None = None) -> list[AdminTeamColorInfo]:
        current_team_id = None
        if team_id is not None:
            current_team_id = AdminTeamService._get_active_team(team_id).id

        colors = (
            TeamColor.objects.filter(is_active=True)
            .select_related("team")
            .order_by("display_order", "id")
        )
        return [
            AdminTeamColorInfo(
                id=color.id,
                name=color.color,
                value=f"#{color.color}",
                available=(
                    color.team_id is None
                    or color.team_id == current_team_id
                    or color.team.status != TeamStatus.ACTIVE
                ),
            )
            for color in colors
        ]

    @staticmethod
    def get_teams(
        q: str | None,
        leader_id: int | None,
        page: int,
        page_size: int,
        admin_user,
    ) -> AdminTeamList:
        queryset = (
            Team.objects.filter(status=TeamStatus.ACTIVE)
            .select_related("owner", "team_color")
            .annotate(
                active_member_count=Count(
                    "team_members",
                    filter=Q(team_members__status=TeamMemberStatus.ACTIVE),
                    distinct=True,
                )
            )
            .order_by("-updated_at", "-id")
        )

        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) | Q(owner__nickname__icontains=q)
            )

        if leader_id is not None:
            queryset = queryset.filter(
                owner_id=admin_user.id if leader_id == 0 else leader_id
            )

        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        return AdminTeamList(
            teams=[
                AdminTeamService._build_team_info(team) for team in queryset[start:end]
            ],
            pagination=build_pagination(
                page=page,
                page_size=page_size,
                total_count=total_count,
            ),
        )

    @staticmethod
    def get_team(team_id: int) -> AdminTeamDetail:
        return AdminTeamService._build_team_detail(
            AdminTeamService._get_active_team(team_id)
        )

    @staticmethod
    @transaction.atomic
    def create_team(admin_user, name: str, color_id: int, leader_id: int):
        if Team.objects.filter(name=name).exists():
            raise DuplicateTeamNameError()

        leader = (
            admin_user
            if leader_id == 0
            else AdminTeamService._get_active_user(leader_id)
        )
        team = Team.objects.create(
            name=name,
            owner=leader,
            status=TeamStatus.ACTIVE,
        )
        TeamMember.objects.create(
            team=team,
            user=leader,
            role=TeamMemberRole.LEADER,
            status=TeamMemberStatus.ACTIVE,
        )
        AdminTeamService._assign_color(color_id=color_id, team=team)
        return AdminTeamService._build_team_detail(team)

    @staticmethod
    @transaction.atomic
    def update_team(team_id: int, name: str | None, color_id: int | None):
        team = AdminTeamService._get_active_team(team_id)
        if name is not None:
            if Team.objects.filter(name=name).exclude(id=team.id).exists():
                raise DuplicateTeamNameError()
            team.name = name
            try:
                team.save(update_fields=["name", "updated_at"])
            except IntegrityError as e:
                raise DuplicateTeamNameError() from e

        if color_id is not None:
            AdminTeamService._assign_color(color_id=color_id, team=team)
            team.save(update_fields=["updated_at"])

        return AdminTeamService._build_team_detail(team)

    @staticmethod
    @transaction.atomic
    def delete_team(team_id: int) -> None:
        team = AdminTeamService._get_active_team(team_id)
        team.status = TeamStatus.DELETED
        team.save(update_fields=["status", "updated_at"])

    @staticmethod
    @transaction.atomic
    def add_members(team_id: int, user_ids: list[int]) -> AdminTeamMemberAddResult:
        team = AdminTeamService._get_active_team(team_id)
        users = list(User.objects.filter(id__in=user_ids, is_active=True))
        if len(users) != len(set(user_ids)):
            raise User.DoesNotExist()
        if any(user.status == UserStatus.BLOCKED for user in users):
            raise BlockedUserIncludedError()

        added_user_ids = []
        for user in users:
            membership, created = TeamMember.objects.get_or_create(
                team=team,
                user=user,
                defaults={
                    "role": TeamMemberRole.MEMBER,
                    "status": TeamMemberStatus.ACTIVE,
                },
            )
            if created:
                added_user_ids.append(user.id)
                continue
            if membership.status != TeamMemberStatus.ACTIVE:
                membership.status = TeamMemberStatus.ACTIVE
                membership.role = TeamMemberRole.MEMBER
                membership.save(update_fields=["status", "role"])
                added_user_ids.append(user.id)

        return AdminTeamMemberAddResult(
            added_user_ids=added_user_ids,
            member_ids=AdminTeamService._get_member_ids(team),
        )

    @staticmethod
    @transaction.atomic
    def change_leader(admin_user, team_id: int, leader_id: int):
        team = AdminTeamService._get_active_team(team_id)
        leader = (
            admin_user
            if leader_id == 0
            else AdminTeamService._get_active_user(leader_id)
        )
        if leader_id == 0:
            target_membership, _ = TeamMember.objects.get_or_create(
                team=team,
                user=leader,
                defaults={
                    "role": TeamMemberRole.MEMBER,
                    "status": TeamMemberStatus.ACTIVE,
                },
            )
            if target_membership.status != TeamMemberStatus.ACTIVE:
                target_membership.status = TeamMemberStatus.ACTIVE
                target_membership.save(update_fields=["status"])
        else:
            try:
                target_membership = TeamMember.objects.get(
                    team=team,
                    user=leader,
                    status=TeamMemberStatus.ACTIVE,
                )
            except TeamMember.DoesNotExist:
                raise NotTeamMemberError()

        TeamMember.objects.filter(
            team=team,
            status=TeamMemberStatus.ACTIVE,
            role=TeamMemberRole.LEADER,
        ).exclude(user=leader).update(role=TeamMemberRole.MEMBER)
        target_membership.role = TeamMemberRole.LEADER
        target_membership.save(update_fields=["role"])
        team.owner = leader
        team.save(update_fields=["owner", "updated_at"])
        return AdminTeamLeaderResult(
            leader_id=leader.id,
            leader_nickname=leader.nickname,
        )

    @staticmethod
    def _get_active_team(team_id: int) -> Team:
        return Team.objects.select_related("owner", "team_color").get(
            id=team_id,
            status=TeamStatus.ACTIVE,
        )

    @staticmethod
    def _get_active_user(user_id: int):
        return User.objects.get(id=user_id, is_active=True)

    @staticmethod
    def _assign_color(color_id: int, team: Team) -> None:
        try:
            target_color = TeamColor.objects.select_for_update().get(
                id=color_id,
                is_active=True,
            )
        except TeamColor.DoesNotExist as e:
            raise ColorUnavailableError() from e

        assigned_to_active_team = (
            target_color.team_id is not None
            and target_color.team_id != team.id
            and Team.objects.filter(
                id=target_color.team_id,
                status=TeamStatus.ACTIVE,
            ).exists()
        )
        if assigned_to_active_team:
            raise ColorUnavailableError()

        TeamColor.objects.select_for_update().filter(team=team).exclude(
            id=target_color.id
        ).update(team=None)
        target_color.team = team
        try:
            target_color.save(update_fields=["team"])
        except IntegrityError as e:
            raise ColorUnavailableError() from e

    @staticmethod
    def _build_team_info(team: Team) -> AdminTeamInfo:
        color_id = None
        color_value = None
        try:
            color_id = team.team_color.id
            color_value = f"#{team.team_color.color}"
        except TeamColor.DoesNotExist:
            pass
        return AdminTeamInfo(
            id=team.id,
            name=team.name,
            color_id=color_id,
            color_value=color_value,
            leader_id=team.owner_id,
            leader_nickname=team.owner.nickname,
            member_count=getattr(team, "active_member_count", None)
            or TeamMember.objects.filter(
                team=team,
                status=TeamMemberStatus.ACTIVE,
            ).count(),
            updated_at=team.updated_at.date(),
        )

    @staticmethod
    def _build_team_detail(team: Team) -> AdminTeamDetail:
        team = Team.objects.select_related("owner", "team_color").get(id=team.id)
        info = AdminTeamService._build_team_info(team)
        memberships = (
            team.team_members.filter(status=TeamMemberStatus.ACTIVE)
            .select_related("user")
            .order_by("joined_at", "id")
        )
        members = [
            AdminTeamMemberInfo(
                id=membership.user_id,
                nickname=membership.user.nickname,
                email=membership.user.email,
                status=AdminUserService._map_status(membership.user.status),
                is_leader=membership.user_id == team.owner_id
                or membership.role == TeamMemberRole.LEADER,
            )
            for membership in memberships
        ]
        return AdminTeamDetail(
            **info.__dict__,
            member_ids=[member.id for member in members],
            members=members,
        )

    @staticmethod
    def _get_member_ids(team: Team) -> list[int]:
        return list(
            team.team_members.filter(status=TeamMemberStatus.ACTIVE)
            .order_by("joined_at", "id")
            .values_list("user_id", flat=True)
        )


@dataclass
class AdminRoomInfo:
    id: int
    name: str
    description: str | None
    open_time: object
    close_time: object
    is_open_all_day: bool
    is_active: bool
    sort_order: int
    updated_at: object


class AdminRoomService:
    @staticmethod
    def get_rooms(include_inactive: bool) -> list[AdminRoomInfo]:
        queryset = StudioRoom.objects.all()
        if not include_inactive:
            queryset = queryset.filter(status=StudioRoomStatus.ACTIVE)
        return [
            AdminRoomService._build_room_info(room)
            for room in queryset.order_by("sort_order", "created_at", "id")
        ]

    @staticmethod
    def get_room(room_id: int) -> AdminRoomInfo:
        return AdminRoomService._build_room_info(AdminRoomService._get_room(room_id))

    @staticmethod
    @transaction.atomic
    def create_room(
        name: str,
        description: str | None,
        open_time,
        close_time,
        is_open_all_day: bool,
    ) -> AdminRoomInfo:
        if StudioRoom.objects.filter(name=name).exists():
            raise DuplicateRoomNameError()
        max_sort_order = StudioRoom.objects.aggregate(max_sort_order=Max("sort_order"))[
            "max_sort_order"
        ]
        room = StudioRoom.objects.create(
            name=name,
            description=description,
            open_time=open_time,
            close_time=close_time,
            is_24_hours=is_open_all_day,
            status=StudioRoomStatus.ACTIVE,
            sort_order=(max_sort_order or 0) + 1,
        )
        return AdminRoomService._build_room_info(room)

    @staticmethod
    @transaction.atomic
    def update_room(
        room_id: int,
        name: str,
        description: str | None,
        open_time,
        close_time,
        is_open_all_day: bool,
    ) -> AdminRoomInfo:
        room = AdminRoomService._get_room(room_id)
        if StudioRoom.objects.filter(name=name).exclude(id=room.id).exists():
            raise DuplicateRoomNameError()
        room.name = name
        room.description = description
        room.open_time = open_time
        room.close_time = close_time
        room.is_24_hours = is_open_all_day
        try:
            room.save(
                update_fields=[
                    "name",
                    "description",
                    "open_time",
                    "close_time",
                    "is_24_hours",
                    "updated_at",
                ]
            )
        except IntegrityError as e:
            raise DuplicateRoomNameError() from e
        return AdminRoomService._build_room_info(room)

    @staticmethod
    @transaction.atomic
    def delete_room(admin_user, room_id: int) -> None:
        room = AdminRoomService._get_room(room_id)
        room.status = StudioRoomStatus.INACTIVE
        room.save(update_fields=["status", "updated_at"])
        Booking.objects.filter(
            room=room,
            status__in=[BookingStatus.PENDING, BookingStatus.RESERVED],
        ).update(
            status=BookingStatus.CANCELED,
            canceled_at=timezone.now(),
            canceled_by=admin_user,
        )

    @staticmethod
    def _get_room(room_id: int) -> StudioRoom:
        return StudioRoom.objects.get(id=room_id)

    @staticmethod
    def _build_room_info(room: StudioRoom) -> AdminRoomInfo:
        return AdminRoomInfo(
            id=room.id,
            name=room.name,
            description=room.description,
            open_time=room.open_time,
            close_time=room.close_time,
            is_open_all_day=room.is_24_hours,
            is_active=room.status == StudioRoomStatus.ACTIVE,
            sort_order=room.sort_order,
            updated_at=room.updated_at.date(),
        )


@dataclass
class AdminReservationInfo:
    id: int
    status: str
    kind: str
    room_id: int
    room_name: str
    date: object
    start_time: object
    end_time: object
    end_next_day: bool
    team_id: int | None
    team_name: str | None
    reserver_user_id: int | None
    name: str
    reserver_name: str
    memo: str
    repeat_weekdays: list[int] | None
    repeat_start_date: object | None
    repeat_end_date: object | None
    canceled_occurrence_dates: list[object]
    canceled_at: object | None
    canceled_by: int | None
    canceled_by_name: str | None


@dataclass
class AdminReservationConflictInfo:
    id: int
    room_id: int
    room_name: str
    date: object
    start_time: object
    end_time: object
    end_next_day: bool
    owner_label: str
    status: str


@dataclass
class AdminReservationList:
    reservations: list[AdminReservationInfo]
    pagination: dict[str, int]


class AdminReservationService:
    @staticmethod
    def get_reservations(
        status: str,
        date_range: int,
        team_type: str,
        room_id: int | None,
        page: int,
        page_size: int,
    ) -> AdminReservationList:
        booking_status = (
            BookingStatus.PENDING if status == "pending" else BookingStatus.RESERVED
        )
        queryset = Booking.objects.filter(status=booking_status).select_related(
            "room", "user", "team", "team__team_color", "canceled_by"
        )
        if status == "approved":
            today = timezone.localdate()
            queryset = queryset.filter(
                reservation_date__gte=today,
                reservation_date__lte=today + timedelta(days=date_range),
            )
        if team_type == "team":
            queryset = queryset.filter(booking_type=BookingType.TEAM)
        elif team_type == "private":
            queryset = queryset.filter(booking_type=BookingType.PRIVATE)
        if room_id is not None:
            queryset = queryset.filter(room_id=room_id)

        queryset = queryset.order_by(
            "-reservation_date", "-start_time", "-reservation_number"
        )
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        return AdminReservationList(
            reservations=[
                AdminReservationService._build_reservation_info(booking)
                for booking in queryset[start:end]
            ],
            pagination=build_pagination(
                page=page,
                page_size=page_size,
                total_count=total_count,
            ),
        )

    @staticmethod
    def get_reservation(reservation_id: int) -> AdminReservationInfo:
        return AdminReservationService._build_reservation_info(
            AdminReservationService._get_booking(reservation_id)
        )

    @staticmethod
    @transaction.atomic
    def create_owner_reservation(
        admin_user,
        room_id: int,
        target_date,
        start_time,
        end_time,
        team_id: int | None,
        title: str,
        memo: str,
        force_cancel_conflict_ids: list[int],
    ) -> AdminReservationInfo:
        room = StudioRoom.objects.get(id=room_id)
        if room.status != StudioRoomStatus.ACTIVE:
            raise RoomInactiveError()
        team = None
        booking_type = BookingType.PRIVATE
        if team_id is not None:
            team = Team.objects.get(id=team_id, status=TeamStatus.ACTIVE)
            booking_type = BookingType.TEAM
            title = ""

        conflicts = AdminReservationService.get_conflicts(
            room_id=room_id,
            target_date=target_date,
            start_time=start_time,
            end_time=end_time,
            exclude_id=None,
        )
        conflict_ids = {conflict.id for conflict in conflicts}
        forced_ids = set(force_cancel_conflict_ids)
        unresolved_ids = conflict_ids - forced_ids
        if unresolved_ids:
            raise ConflictReservationError()
        if forced_ids:
            Booking.objects.filter(
                reservation_number__in=forced_ids,
                status__in=[BookingStatus.PENDING, BookingStatus.RESERVED],
            ).update(
                status=BookingStatus.CANCELED,
                canceled_at=timezone.now(),
                canceled_by=admin_user,
            )

        booking = Booking.objects.create(
            room=room,
            user=admin_user,
            team=team,
            booking_type=booking_type,
            reservation_date=target_date,
            start_time=start_time,
            end_time=end_time,
            title=title or None,
            memo=memo or "",
            status=BookingStatus.RESERVED,
        )
        return AdminReservationService._build_reservation_info(booking)

    @staticmethod
    @transaction.atomic
    def approve_reservation(reservation_id: int) -> AdminReservationInfo:
        booking = AdminReservationService._get_booking(reservation_id)
        if booking.status == BookingStatus.RESERVED:
            raise AlreadyApprovedError()
        booking.status = BookingStatus.RESERVED
        booking.save(update_fields=["status", "updated_at"])
        return AdminReservationService._build_reservation_info(booking)

    @staticmethod
    @transaction.atomic
    def cancel_reservation(admin_user, reservation_id: int) -> None:
        booking = AdminReservationService._get_booking(reservation_id)
        booking.status = BookingStatus.CANCELED
        booking.canceled_at = timezone.now()
        booking.canceled_by = admin_user
        booking.save(
            update_fields=["status", "canceled_at", "canceled_by", "updated_at"]
        )

    @staticmethod
    @transaction.atomic
    def cancel_occurrences(reservation_id: int, dates: list) -> list:
        booking = AdminReservationService._get_booking(reservation_id)
        if not booking.repeat_group_id:
            raise NotRepeatReservationError()
        existing_dates = list(booking.canceled_occurrence_dates or [])
        date_values = [target_date.isoformat() for target_date in dates]
        merged_dates = sorted(set(existing_dates + date_values))
        booking.canceled_occurrence_dates = merged_dates
        booking.save(update_fields=["canceled_occurrence_dates", "updated_at"])
        return booking.canceled_occurrence_dates

    @staticmethod
    def get_conflicts(
        room_id: int,
        target_date,
        start_time,
        end_time,
        exclude_id: int | None = None,
    ) -> list[AdminReservationConflictInfo]:
        room = StudioRoom.objects.get(id=room_id)
        start_at = AdminReservationService._normalize_time(
            room, target_date, start_time
        )
        end_at = AdminReservationService._normalize_end_time(
            room, target_date, start_time, end_time
        )
        queryset = Booking.objects.filter(
            room=room,
            reservation_date=target_date,
            status__in=[BookingStatus.PENDING, BookingStatus.RESERVED],
        ).select_related("room", "user", "team", "team__team_color")
        if exclude_id is not None:
            queryset = queryset.exclude(reservation_number=exclude_id)

        conflicts = []
        for booking in queryset:
            booking_start_at = AdminReservationService._normalize_time(
                room, target_date, booking.start_time
            )
            booking_end_at = AdminReservationService._normalize_end_time(
                room, target_date, booking.start_time, booking.end_time
            )
            if start_at < booking_end_at and end_at > booking_start_at:
                conflicts.append(AdminReservationService._build_conflict_info(booking))
        return conflicts

    @staticmethod
    def _get_booking(reservation_id: int) -> Booking:
        return Booking.objects.select_related(
            "room", "user", "team", "canceled_by"
        ).get(reservation_number=reservation_id)

    @staticmethod
    def _build_reservation_info(booking: Booking) -> AdminReservationInfo:
        reserver_name = AdminReservationService._resolve_reserver_name(booking)
        display_name = booking.team.name if booking.team_id else reserver_name
        return AdminReservationInfo(
            id=booking.reservation_number,
            status=AdminReservationService._map_status(booking.status),
            kind="repeat" if booking.repeat_group_id else "single",
            room_id=booking.room_id,
            room_name=booking.room.name,
            date=booking.reservation_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            end_next_day=booking.end_time <= booking.start_time,
            team_id=booking.team_id,
            team_name=booking.team.name if booking.team_id else None,
            reserver_user_id=booking.user_id,
            name=display_name,
            reserver_name=reserver_name,
            memo=booking.memo,
            repeat_weekdays=booking.repeat_weekdays,
            repeat_start_date=booking.repeat_start_date,
            repeat_end_date=booking.repeat_end_date,
            canceled_occurrence_dates=booking.canceled_occurrence_dates or [],
            canceled_at=booking.canceled_at,
            canceled_by=booking.canceled_by_id,
            canceled_by_name=(
                booking.canceled_by.nickname if booking.canceled_by_id else None
            ),
        )

    @staticmethod
    def _build_conflict_info(booking: Booking) -> AdminReservationConflictInfo:
        if booking.booking_type == BookingType.TEAM:
            owner_label = f"팀: {booking.team.name}"
        else:
            owner_label = (
                f"개인: {AdminReservationService._resolve_reserver_name(booking)}"
            )
        return AdminReservationConflictInfo(
            id=booking.reservation_number,
            room_id=booking.room_id,
            room_name=booking.room.name,
            date=booking.reservation_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            end_next_day=booking.end_time <= booking.start_time,
            owner_label=owner_label,
            status=AdminReservationService._map_status(booking.status),
        )

    @staticmethod
    def _resolve_reserver_name(booking: Booking) -> str:
        if (
            booking.booking_type == BookingType.PRIVATE
            and booking.user.is_staff
            and booking.title
        ):
            return booking.title
        return booking.user.nickname or ""

    @staticmethod
    def _map_status(booking_status: str) -> str:
        if booking_status == BookingStatus.RESERVED:
            return "approved"
        if booking_status == BookingStatus.CANCELED:
            return "canceled"
        return "pending"

    @staticmethod
    def _normalize_time(room: StudioRoom, target_date, target_time):
        normalized_at = datetime.combine(target_date, target_time)
        if (room.is_24_hours or room.close_time < room.open_time) and (
            target_time < room.open_time
        ):
            normalized_at += timedelta(days=1)
        return normalized_at

    @staticmethod
    def _normalize_end_time(room: StudioRoom, target_date, start_time, end_time):
        start_at = AdminReservationService._normalize_time(
            room, target_date, start_time
        )
        end_at = AdminReservationService._normalize_time(room, target_date, end_time)
        if (
            room.is_24_hours or room.close_time < room.open_time
        ) and end_at <= start_at:
            end_at += timedelta(days=1)
        return end_at


@dataclass
class AdminDayOffInfo:
    id: int
    room_id: int | None
    room_name: str
    type: str
    start_date: object
    end_date: object
    start_time: object | None
    end_time: object | None
    is_all_day: bool
    reason: str | None
    created_at: object


@dataclass
class AdminDayOffList:
    day_offs: list[AdminDayOffInfo]
    pagination: dict[str, int]


class AdminDayOffService:
    TYPE_TO_MODEL = {
        "점검": ClosureType.MAINTENANCE,
        "휴무": ClosureType.HOLIDAY,
        "기타": ClosureType.BLOCKED,
    }
    MODEL_TO_TYPE = {
        ClosureType.MAINTENANCE: "점검",
        ClosureType.HOLIDAY: "휴무",
        ClosureType.BLOCKED: "기타",
    }

    @staticmethod
    def get_day_offs(room_id: int | None, page: int, page_size: int) -> AdminDayOffList:
        queryset = RoomClosure.objects.select_related("room").order_by(
            "-start_date", "-id"
        )
        if room_id is not None:
            queryset = queryset.filter(Q(room_id=room_id) | Q(room__isnull=True))
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        return AdminDayOffList(
            day_offs=[
                AdminDayOffService._build_day_off_info(closure)
                for closure in queryset[start:end]
            ],
            pagination=build_pagination(
                page=page,
                page_size=page_size,
                total_count=total_count,
            ),
        )

    @staticmethod
    def check_conflicts(
        room_id: int | None,
        day_off_type: str,
        start_date,
        end_date,
        start_time,
        end_time,
        is_all_day: bool,
    ) -> list[AdminReservationConflictInfo]:
        is_all_day, start_time, end_time = AdminDayOffService._normalize_day_off_time(
            day_off_type=day_off_type,
            is_all_day=is_all_day,
            start_time=start_time,
            end_time=end_time,
        )
        room_ids = AdminDayOffService._get_target_room_ids(room_id)
        conflicts = []
        current_date = start_date
        while current_date <= end_date:
            for target_room_id in room_ids:
                room = StudioRoom.objects.get(id=target_room_id)
                check_start_time = start_time or room.open_time
                check_end_time = end_time or room.close_time
                if is_all_day:
                    check_start_time = room.open_time
                    check_end_time = room.close_time
                conflicts.extend(
                    AdminReservationService.get_conflicts(
                        room_id=target_room_id,
                        target_date=current_date,
                        start_time=check_start_time,
                        end_time=check_end_time,
                    )
                )
            current_date += timedelta(days=1)
        return conflicts

    @staticmethod
    @transaction.atomic
    def create_day_off(
        admin_user,
        room_id: int | None,
        day_off_type: str,
        start_date,
        end_date,
        start_time,
        end_time,
        is_all_day: bool,
        reason: str | None,
        force_cancel_reservation_ids: list[int],
    ) -> AdminDayOffInfo:
        room = None
        if room_id is not None:
            room = StudioRoom.objects.get(id=room_id)
        is_all_day, start_time, end_time = AdminDayOffService._normalize_day_off_time(
            day_off_type=day_off_type,
            is_all_day=is_all_day,
            start_time=start_time,
            end_time=end_time,
        )

        conflicts = AdminDayOffService.check_conflicts(
            room_id=room_id,
            day_off_type=day_off_type,
            start_date=start_date,
            end_date=end_date,
            start_time=start_time,
            end_time=end_time,
            is_all_day=is_all_day,
        )
        conflict_ids = {conflict.id for conflict in conflicts}
        forced_ids = set(force_cancel_reservation_ids)
        if conflict_ids - forced_ids:
            raise ReservationConflictError(conflicts)
        if forced_ids:
            Booking.objects.filter(
                reservation_number__in=forced_ids,
                status__in=[BookingStatus.PENDING, BookingStatus.RESERVED],
            ).update(
                status=BookingStatus.CANCELED,
                canceled_at=timezone.now(),
                canceled_by=admin_user,
            )

        closure = RoomClosure.objects.create(
            room=room,
            closure_date=start_date,
            start_date=start_date,
            end_date=end_date,
            start_time=None if is_all_day else start_time,
            end_time=None if is_all_day else end_time,
            is_all_day=is_all_day,
            closure_type=AdminDayOffService.TYPE_TO_MODEL[day_off_type],
            reason=reason or "",
        )
        return AdminDayOffService._build_day_off_info(closure)

    @staticmethod
    def _normalize_day_off_time(
        day_off_type: str,
        is_all_day: bool,
        start_time,
        end_time,
    ):
        if day_off_type == "휴무":
            return True, None, None
        return is_all_day, start_time, end_time

    @staticmethod
    @transaction.atomic
    def delete_day_off(day_off_id: int) -> None:
        RoomClosure.objects.get(id=day_off_id).delete()

    @staticmethod
    def _get_target_room_ids(room_id: int | None) -> list[int]:
        if room_id is not None:
            if not StudioRoom.objects.filter(id=room_id).exists():
                raise StudioRoom.DoesNotExist()
            return [room_id]
        return list(StudioRoom.objects.values_list("id", flat=True))

    @staticmethod
    def _build_day_off_info(closure: RoomClosure) -> AdminDayOffInfo:
        return AdminDayOffInfo(
            id=closure.id,
            room_id=closure.room_id,
            room_name=closure.room.name if closure.room_id else "전체 합주실",
            type=AdminDayOffService.MODEL_TO_TYPE[closure.closure_type],
            start_date=closure.start_date or closure.closure_date,
            end_date=closure.end_date or closure.closure_date,
            start_time=closure.start_time,
            end_time=closure.end_time,
            is_all_day=closure.is_all_day,
            reason=closure.reason,
            created_at=closure.created_at,
        )


@dataclass
class AdminLogInfo:
    id: int
    category: str
    action: str
    target: str
    detail: str
    created_at: object


@dataclass
class AdminLogList:
    logs: list[AdminLogInfo]
    pagination: dict[str, object]


class AdminLogService:
    @staticmethod
    def record(admin, category: str, action: str, target: str = "", detail: str = ""):
        return AdminActionLog.objects.create(
            admin=admin,
            category=category,
            action=action,
            target=target or "",
            detail=detail or "",
        )

    @staticmethod
    def get_logs(
        category: str | None,
        created_after,
        cursor: str | None,
        page_size: int,
    ) -> AdminLogList:
        queryset = AdminActionLog.objects.order_by("-created_at", "-id")
        if category:
            queryset = queryset.filter(category=category)
        if created_after:
            queryset = queryset.filter(created_at__gte=created_after)
        if cursor:
            cursor_created_at, cursor_id = AdminLogService._decode_cursor(cursor)
            queryset = queryset.filter(
                Q(created_at__lt=cursor_created_at)
                | Q(created_at=cursor_created_at, id__lt=cursor_id)
            )

        logs = list(queryset[: page_size + 1])
        has_next = len(logs) > page_size
        page_logs = logs[:page_size]
        next_cursor = None
        if has_next and page_logs:
            next_cursor = AdminLogService._encode_cursor(page_logs[-1])

        return AdminLogList(
            logs=[AdminLogService._build_log_info(log) for log in page_logs],
            pagination={
                "next_cursor": next_cursor,
                "has_next": has_next,
                "page_size": page_size,
            },
        )

    @staticmethod
    def _build_log_info(log: AdminActionLog) -> AdminLogInfo:
        return AdminLogInfo(
            id=log.id,
            category=log.category,
            action=log.action,
            target=log.target,
            detail=log.detail,
            created_at=log.created_at,
        )

    @staticmethod
    def _encode_cursor(log: AdminActionLog) -> str:
        raw_cursor = f"{log.created_at.isoformat()}__{log.id}"
        return base64.b64encode(raw_cursor.encode()).decode()

    @staticmethod
    def _decode_cursor(cursor: str):
        raw_cursor = base64.b64decode(cursor.encode()).decode()
        created_at_value, id_value = raw_cursor.rsplit("__", 1)
        return datetime.fromisoformat(created_at_value), int(id_value)
