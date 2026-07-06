import type {
    AdminReservation,
    AdminReservationConflict,
} from '../components/admin/reservations/types';
import type {
    AdminPracticeRoom,
    AdminRoomAffectedReservation,
    AdminRoomDayOff,
} from '../components/admin/rooms/types';
import type {
    AdminManagedTeam,
    AdminManagedUser,
} from '../components/admin/users/types';

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export type AdminResponse<T> =
    | {
          ok: true;
          data: T;
          pagination?: unknown;
      }
    | {
          ok: false;
          error_code?: string;
          message?: string;
          data?: unknown;
      };

export type ApiReservation = {
    id: number;
    status: 'pending' | 'approved';
    kind: 'single' | 'repeat';
    room_id: number;
    room_name: string;
    date: string;
    start_time: string;
    end_time: string;
    end_next_day: boolean;
    team_id: number | null;
    team_name: string | null;
    reserver_user_id: number | null;
    name: string;
    reserver_name: string;
    memo?: string | null;
    repeat_weekdays?: number[] | null;
    repeat_start_date?: string | null;
    repeat_end_date?: string | null;
    canceled_occurrence_dates?: string[];
};

export type ApiUser = {
    id: number;
    nickname?: string | null;
    email?: string | null;
    status: 'normal' | 'blocked';
    joined_at: string;
    team_ids: number[];
};

export type ApiTeam = {
    id: number;
    name: string;
    color_id?: number | string | null;
    color_value?: string | null;
    leader_id: number;
    leader_nickname?: string | null;
    member_count?: number;
    member_ids?: number[];
    updated_at: string;
};

export type ApiRoom = {
    id: number;
    name: string;
    description?: string | null;
    open_time: string;
    close_time: string;
    is_open_all_day: boolean;
    is_active: boolean;
    sort_order: number;
    updated_at: string;
};

export type ApiDayOff = {
    id: number;
    room_id: number | null;
    room_name: string;
    type: '휴무' | '점검' | '기타';
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    is_all_day: boolean;
    reason?: string | null;
    created_at: string;
};

export type ApiConflict = {
    id: number;
    room_id?: number;
    room_name: string;
    date: string;
    start_time: string;
    end_time: string;
    end_next_day: boolean;
    owner_label: string;
    status: 'pending' | 'approved';
};

export const unwrapAdminResponse = <T>(response: AdminResponse<T>): T => {
    if (!response.ok) {
        throw new Error(response.message || '관리자 API 요청에 실패했습니다.');
    }

    return response.data;
};

const trimSeconds = (time: string | null | undefined): string =>
    time ? time.slice(0, 5) : '';

const formatDateDots = (date: string): string => date.replaceAll('-', '.');

const toDateLabel = (
    kind: string,
    date: string,
    repeatWeekdays?: number[] | null,
): string => {
    if (kind === 'repeat' && repeatWeekdays && repeatWeekdays.length > 0) {
        return `매주 ${repeatWeekdays
            .map((day) => WEEKDAY_SHORT[day])
            .join('/')}`;
    }

    const parsedDate = new Date(`${date}T00:00:00`);
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${month}.${day} (${WEEKDAY_SHORT[parsedDate.getDay()]})`;
};

const toPeriodLabel = (
    start?: string | null,
    end?: string | null,
): string | undefined => {
    if (!start || !end) return undefined;

    const [, startMonth, startDay] = start.split('-');
    const [, endMonth, endDay] = end.split('-');

    return `${startMonth}.${startDay}~${endMonth}.${endDay}`;
};

const toDayOffset = (date: string, baseDate = new Date()): number => {
    const today = new Date(baseDate);
    today.setHours(0, 0, 0, 0);

    const target = new Date(`${date}T00:00:00`);

    return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const toTimeLabel = (
    startTime: string,
    endTime: string,
    endNextDay: boolean,
): string => {
    const start = trimSeconds(startTime);
    const end = trimSeconds(endTime);

    return endNextDay ? `${start}~다음날 ${end}` : `${start}~${end}`;
};

export const toReservation = (
    reservation: ApiReservation,
    baseDate = new Date(),
    adminUserId?: number,
): AdminReservation => ({
    id: reservation.id,
    status: reservation.status,
    kind: reservation.kind,
    dateLabel: toDateLabel(
        reservation.kind,
        reservation.date,
        reservation.repeat_weekdays,
    ),
    dayOffset: toDayOffset(reservation.date, baseDate),
    timeLabel: toTimeLabel(
        reservation.start_time,
        reservation.end_time,
        reservation.end_next_day,
    ),
    periodLabel: toPeriodLabel(
        reservation.repeat_start_date,
        reservation.repeat_end_date,
    ),
    room: reservation.room_name,
    roomId: reservation.room_id,
    teamId: reservation.team_id ?? undefined,
    teamName: reservation.team_name ?? undefined,
    reserverUserId: reservation.reserver_user_id ?? undefined,
    reserverName:
        reservation.reserver_user_id === adminUserId
            ? '사장님'
            : reservation.reserver_name || reservation.name,
    memo: reservation.memo?.trim() || undefined,
    canceledOccurrenceDates: reservation.canceled_occurrence_dates ?? [],
});

export const toUser = (
    user: ApiUser,
    adminUserId?: number,
): AdminManagedUser => ({
    id: user.id,
    nickname: user.id === adminUserId ? '사장님' : user.nickname || '이름 없음',
    email: user.email || '',
    status: user.status,
    joinedAt: formatDateDots(user.joined_at),
    teams: user.team_ids,
});

export const toTeam = (team: ApiTeam): AdminManagedTeam => ({
    id: team.id,
    name: team.name,
    colorId: team.color_id == null ? '' : String(team.color_id),
    leaderId: team.leader_id,
    leaderName: team.leader_nickname ?? undefined,
    memberCount: team.member_count,
    memberIds: team.member_ids ?? [],
    updatedAt: formatDateDots(team.updated_at),
});

export const toRoom = (room: ApiRoom) => ({
    id: room.id,
    name: room.name,
    description: room.description ?? '',
    openTime: trimSeconds(room.open_time),
    closeTime: trimSeconds(room.close_time),
    isOpenAllDay: room.is_open_all_day,
    isActive: room.is_active,
    sortOrder: room.sort_order,
    updatedAt: formatDateDots(room.updated_at),
});

export const toRoomRequest = (
    data: Omit<AdminPracticeRoom, 'id' | 'updatedAt'>,
) => ({
    name: data.name,
    description: data.description,
    open_time: data.openTime,
    close_time: data.isOpenAllDay ? data.openTime : data.closeTime,
    is_open_all_day: data.isOpenAllDay,
});

export const toDayOff = (dayOff: ApiDayOff): AdminRoomDayOff => {
    const isSingleDate = dayOff.start_date === dayOff.end_date;
    const dateLabel = isSingleDate
        ? formatDateDots(dayOff.start_date)
        : `${formatDateDots(dayOff.start_date)} ~ ${formatDateDots(dayOff.end_date)}`;
    const timeLabel = dayOff.is_all_day
        ? '하루전체'
        : `${trimSeconds(dayOff.start_time)}~${trimSeconds(dayOff.end_time)}`;

    return {
        id: dayOff.id,
        roomName: dayOff.room_name,
        dateLabel,
        timeLabel,
        type: dayOff.type,
        reason: dayOff.reason?.trim() || '사유 없음',
    };
};

export const toConflict = (
    conflict: ApiConflict,
): AdminReservationConflict => ({
    id: conflict.id,
    room: conflict.room_name,
    roomId: conflict.room_id,
    date: formatDateDots(conflict.date),
    timeLabel: toTimeLabel(
        conflict.start_time,
        conflict.end_time,
        conflict.end_next_day,
    ),
    ownerLabel: conflict.owner_label,
    status: conflict.status,
});

export const toAffectedReservation = (
    conflict: ApiConflict,
): AdminRoomAffectedReservation => ({
    id: conflict.id,
    roomName: conflict.room_name,
    dateTime: `${formatDateDots(conflict.date)} ${toTimeLabel(
        conflict.start_time,
        conflict.end_time,
        conflict.end_next_day,
    )}`,
    reserver: conflict.owner_label,
    status: conflict.status === 'approved' ? '승인 완료' : '승인 대기',
});
