import {
    ACCESS_TOKEN_KEY,
    API_BASE_URL,
} from '../constants/env';
import type {
    AdminReservation,
    AdminReservationConflict,
    NewAdminReservation,
} from '../components/admin/reservations/types';
import type {
    AdminManagedTeam,
    AdminManagedUser,
    AdminTeamColor,
    AdminTeamLeaderFilterOption,
} from '../components/admin/users/types';
import type {
    AdminPracticeRoom,
    AdminRoomAffectedReservation,
    AdminRoomDayOff,
    AdminRoomDayOffDraft,
} from '../components/admin/rooms/types';
import { mockAdminReservations } from '../components/admin/reservations/mockReservations';
import {
    mockAdminTeams,
    mockAdminUsers,
    mockTeamColors,
} from '../components/admin/users/mockAdminUsers';
import {
    mockAdminPracticeRooms,
    mockAdminRoomDayOffs,
    mockCheckRoomDayOffConflicts,
} from '../components/admin/rooms/mockAdminRooms';

/**
 * 관리자 API 레이어
 *
 * 현재 관리자 백엔드는 아직 준비되지 않아 목업 데이터를 강제로 사용합니다.
 * 준비가 끝나면 ADMIN_API_READY 값을 true로 바꾸고,
 * 각 함수의 실제 호출 분기를 그대로 사용하면 됩니다.
 *
 * 예상 연결 기준:
 * - base: `${API_BASE_URL}/admin`
 * - 예: `${API_BASE_URL}/admin/reservations/`
 *
 * TODO(admin-backend):
 * 1. 응답 스키마가 확정되면 zod schema + mapper 분리
 * 2. ADMIN_API_READY 를 true 로 전환
 * 3. access token 저장 키가 달라지면 getAuthHeaders 쪽만 수정
 */

const ADMIN_API_READY = false;

const ADMIN_API_MESSAGE = {
    requestError: '관리자 API 요청에 실패했습니다.',
} as const;

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

type ApiReservation = {
    id: number;
    status: 'pending' | 'approved';
    kind: 'single' | 'repeat';
    room_name: string;
    date: string;
    start_time: string;
    end_time: string;
    end_next_day: boolean;
    team_id: number | null;
    team_name: string | null;
    reserver_user_id: number | null;
    reserver_name: string;
    memo: string | null;
    repeat_weekdays: number[] | null;
    repeat_start_date: string | null;
    repeat_end_date: string | null;
    canceled_occurrence_dates: string[];
};

type ApiUser = {
    id: number;
    nickname: string;
    email: string;
    status: 'normal' | 'blocked';
    joined_at: string;
    team_ids: number[];
};

type ApiTeam = {
    id: number;
    name: string;
    color_id: string;
    leader_id: number;
    member_ids: number[];
    updated_at: string;
};

type ApiRoom = {
    id: number;
    name: string;
    description: string;
    open_time: string;
    close_time: string;
    is_open_all_day: boolean;
    is_active: boolean;
    sort_order: number;
    updated_at: string;
};

type ApiDayOff = {
    id: number;
    room_name: string;
    date_label: string;
    time_label: string;
    type: '휴무' | '점검' | '기타';
    reason: string;
};

type ApiConflict = {
    id: number;
    room: string;
    date: string;
    time_label: string;
    owner_label: string;
    status: 'pending' | 'approved';
};

type ApiAffectedReservation = {
    id: number;
    room_name: string;
    date_time: string;
    reserver: string;
    status: '승인 완료' | '승인 대기';
};

const buildAdminUrl = (path = '') => `${API_BASE_URL}/admin/${path}`;

const getAuthHeaders = (): HeadersInit => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';

    return {
        'Content-Type': 'application/json',
        ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
    };
};

const requestJson = async <T>(
    input: RequestInfo | URL,
    init: RequestInit,
): Promise<T> => {
    const response = await fetch(input, init);

    if (!response.ok) {
        throw new Error(
            `${ADMIN_API_MESSAGE.requestError} (status: ${response.status})`,
        );
    }

    return response.json() as Promise<T>;
};

const requestVoid = async (
    input: RequestInfo | URL,
    init: RequestInit,
): Promise<void> => {
    const response = await fetch(input, init);

    if (!response.ok) {
        throw new Error(
            `${ADMIN_API_MESSAGE.requestError} (status: ${response.status})`,
        );
    }
};

const toDateLabel = (
    kind: string,
    date: string,
    repeatWeekdays: number[] | null,
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
    start: string | null,
    end: string | null,
): string | undefined => {
    if (!start || !end) return undefined;

    const [, startMonth, startDay] = start.split('-');
    const [, endMonth, endDay] = end.split('-');

    return `${startMonth}.${startDay}~${endMonth}.${endDay}`;
};

const toDayOffset = (date: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(`${date}T00:00:00`);

    return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const todayString = (): string => {
    const now = new Date();

    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
};

const toReservation = (reservation: ApiReservation): AdminReservation => ({
    id: reservation.id,
    status: reservation.status,
    kind: reservation.kind,
    dateLabel: toDateLabel(
        reservation.kind,
        reservation.date,
        reservation.repeat_weekdays,
    ),
    dayOffset: toDayOffset(reservation.date),
    timeLabel: reservation.end_next_day
        ? `${reservation.start_time}~다음날 ${reservation.end_time}`
        : `${reservation.start_time}~${reservation.end_time}`,
    periodLabel: toPeriodLabel(
        reservation.repeat_start_date,
        reservation.repeat_end_date,
    ),
    room: reservation.room_name,
    teamId: reservation.team_id ?? undefined,
    teamName: reservation.team_name ?? undefined,
    reserverUserId: reservation.reserver_user_id ?? undefined,
    reserverName: reservation.reserver_name,
    memo: reservation.memo ?? undefined,
    canceledOccurrenceDates: reservation.canceled_occurrence_dates,
});

const toUser = (user: ApiUser): AdminManagedUser => ({
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    status: user.status,
    joinedAt: user.joined_at,
    teams: user.team_ids,
});

const toTeam = (team: ApiTeam): AdminManagedTeam => ({
    id: team.id,
    name: team.name,
    colorId: team.color_id,
    leaderId: team.leader_id,
    memberIds: team.member_ids,
    updatedAt: team.updated_at,
});

const toRoom = (room: ApiRoom): AdminPracticeRoom => ({
    id: room.id,
    name: room.name,
    description: room.description,
    openTime: room.open_time,
    closeTime: room.close_time,
    isOpenAllDay: room.is_open_all_day,
    isActive: room.is_active,
    sortOrder: room.sort_order,
    updatedAt: room.updated_at,
});

const toDayOff = (dayOff: ApiDayOff): AdminRoomDayOff => ({
    id: dayOff.id,
    roomName: dayOff.room_name,
    dateLabel: dayOff.date_label,
    timeLabel: dayOff.time_label,
    type: dayOff.type,
    reason: dayOff.reason,
});

const toConflict = (
    conflict: ApiConflict,
): AdminReservationConflict => ({
    id: conflict.id,
    room: conflict.room,
    date: conflict.date,
    timeLabel: conflict.time_label,
    ownerLabel: conflict.owner_label,
    status: conflict.status,
});

const toAffectedReservation = (
    reservation: ApiAffectedReservation,
): AdminRoomAffectedReservation => ({
    id: reservation.id,
    roomName: reservation.room_name,
    dateTime: reservation.date_time,
    reserver: reservation.reserver,
    status: reservation.status,
});

export const getReservations = async (): Promise<AdminReservation[]> => {
    if (!ADMIN_API_READY) return [...mockAdminReservations];

    // 관리자 예약 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/reservations/`
    const data = await requestJson<ApiReservation[]>(
        buildAdminUrl('reservations/'),
        {
            method: 'GET',
            headers: getAuthHeaders(),
        },
    );

    return data.map(toReservation);
};

export const approveReservation = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 예약 승인 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/reservations/${id}/approve/`
    await requestVoid(buildAdminUrl(`reservations/${id}/approve/`), {
        method: 'POST',
        headers: getAuthHeaders(),
    });
};

export const cancelReservation = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 예약 취소 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/reservations/${id}/cancel/`
    await requestVoid(buildAdminUrl(`reservations/${id}/cancel/`), {
        method: 'POST',
        headers: getAuthHeaders(),
    });
};

export const cancelOccurrences = async (
    id: number,
    dates: string[],
): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 반복 예약 부분 취소 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/reservations/${id}/cancel-occurrences/`
    await requestVoid(
        buildAdminUrl(`reservations/${id}/cancel-occurrences/`),
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ dates }),
        },
    );
};

export const checkReservationConflicts = async (
    reservation: NewAdminReservation,
): Promise<AdminReservationConflict[]> => {
    if (!ADMIN_API_READY) {
        const hasConflict =
            reservation.room === 'B201' &&
            reservation.date === '2026-05-15';

        if (!hasConflict) return [];

        return [
            {
                id: 1,
                room: 'B201',
                date: '2026.05.15',
                timeLabel: '19:00~21:00',
                ownerLabel: '팀: 사운드웨이브',
                status: 'approved',
            },
            {
                id: 3,
                room: 'B201',
                date: '2026.05.15',
                timeLabel: '21:00~22:00',
                ownerLabel: '개인 예약: 박지훈',
                status: 'approved',
            },
            {
                id: 4,
                room: 'B201',
                date: '2026.05.15',
                timeLabel: '18:30~19:30',
                ownerLabel: '팀: 블루코드',
                status: 'pending',
            },
        ];
    }

    const searchParams = new URLSearchParams({
        room: reservation.room,
        date: reservation.date,
        start_time: reservation.startTime,
        end_time: reservation.endTime,
    });

    // 관리자 예약 충돌 검사 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/reservations/check-conflicts/?...`
    const data = await requestJson<ApiConflict[]>(
        `${buildAdminUrl('reservations/check-conflicts/')}?${searchParams.toString()}`,
        {
            method: 'GET',
            headers: getAuthHeaders(),
        },
    );

    return data.map(toConflict);
};

export const createReservation = async (
    reservation: NewAdminReservation,
    canceledConflictIds: number[] = [],
): Promise<AdminReservation> => {
    if (!ADMIN_API_READY) {
        const parsedDate = new Date(`${reservation.date}T00:00:00`);
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');

        return {
            id: Date.now(),
            status: 'approved',
            kind: 'single',
            dateLabel: `${month}.${day} (${WEEKDAY_SHORT[parsedDate.getDay()]})`,
            dayOffset: toDayOffset(reservation.date),
            timeLabel: `${reservation.startTime}~${reservation.endTime}`,
            room: reservation.room,
            teamId: reservation.teamId,
            teamName: reservation.teamName,
            reserverName: reservation.title,
            memo: reservation.memo || undefined,
            canceledOccurrenceDates: [],
        };
    }

    // 관리자 예약 생성 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/reservations/`
    const data = await requestJson<ApiReservation>(
        buildAdminUrl('reservations/'),
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                date: reservation.date,
                start_time: reservation.startTime,
                end_time: reservation.endTime,
                room_name: reservation.room,
                team_id: reservation.teamId ?? null,
                team_name: reservation.teamName ?? null,
                memo: reservation.memo,
                force_cancel_reservation_ids: canceledConflictIds,
            }),
        },
    );

    return toReservation(data);
};

export const getUsers = async (): Promise<AdminManagedUser[]> => {
    if (!ADMIN_API_READY) return [...mockAdminUsers];

    // 관리자 사용자 목록 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/users/`
    const data = await requestJson<ApiUser[]>(buildAdminUrl('users/'), {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    return data.map(toUser);
};

export const blockUser = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 사용자 블락 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/users/${id}/block/`
    await requestVoid(buildAdminUrl(`users/${id}/block/`), {
        method: 'POST',
        headers: getAuthHeaders(),
    });
};

export const unblockUser = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 사용자 블락 해제 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/users/${id}/unblock/`
    await requestVoid(buildAdminUrl(`users/${id}/unblock/`), {
        method: 'POST',
        headers: getAuthHeaders(),
    });
};

export const getTeams = async (): Promise<AdminManagedTeam[]> => {
    if (!ADMIN_API_READY) return [...mockAdminTeams];

    // 관리자 팀 목록 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/teams/`
    const data = await requestJson<ApiTeam[]>(buildAdminUrl('teams/'), {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    return data.map(toTeam);
};

export const getTeamColors = async (
    currentTeamId?: number,
): Promise<AdminTeamColor[]> => {
    if (!ADMIN_API_READY) return [...mockTeamColors];

    const searchParams = new URLSearchParams();

    if (currentTeamId != null) {
        searchParams.set('team_id', String(currentTeamId));
    }

    const queryString = searchParams.toString();

    // 관리자 팀 색상 목록 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/teams/colors/?team_id=...`
    return requestJson<AdminTeamColor[]>(
        `${buildAdminUrl('teams/colors/')}${queryString ? `?${queryString}` : ''}`,
        {
            method: 'GET',
            headers: getAuthHeaders(),
        },
    );
};

export const getTeamLeaderOptions = async (
    teams: AdminManagedTeam[],
    users: AdminManagedUser[],
): Promise<AdminTeamLeaderFilterOption[]> => {
    if (!ADMIN_API_READY) {
        const leaderIds = Array.from(new Set(teams.map((team) => team.leaderId)));

        return leaderIds
            .map((id) => {
                if (id === 0) return { id: 0, nickname: '사장님' };

                const user = users.find((currentUser) => currentUser.id === id);

                return user
                    ? { id: user.id, nickname: user.nickname }
                    : null;
            })
            .filter(
                (
                    option,
                ): option is AdminTeamLeaderFilterOption => Boolean(option),
            );
    }

    // 관리자 팀장 옵션 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/teams/leader-options/`
    return requestJson<AdminTeamLeaderFilterOption[]>(
        buildAdminUrl('teams/leader-options/'),
        {
            method: 'GET',
            headers: getAuthHeaders(),
        },
    );
};

export const createTeam = async (data: {
    name: string;
    colorId: string;
    leaderId: number;
    memberIds: number[];
}): Promise<AdminManagedTeam> => {
    if (!ADMIN_API_READY) {
        return {
            id: Date.now(),
            name: data.name,
            colorId: data.colorId,
            leaderId: data.leaderId,
            memberIds: data.memberIds,
            updatedAt: todayString(),
        };
    }

    // 관리자 팀 생성 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/teams/`
    const result = await requestJson<ApiTeam>(buildAdminUrl('teams/'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            name: data.name,
            color_id: data.colorId,
            leader_id: data.leaderId,
            member_ids: data.memberIds,
        }),
    });

    return toTeam(result);
};

export const updateTeam = async (
    id: number,
    data: Partial<{
        name: string;
        colorId: string;
        leaderId: number;
        memberIds: number[];
    }>,
): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 팀 수정 API 준비 후 사용:
    // PATCH `${API_BASE_URL}/admin/teams/${id}/`
    await requestVoid(buildAdminUrl(`teams/${id}/`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.colorId !== undefined ? { color_id: data.colorId } : {}),
            ...(data.leaderId !== undefined ? { leader_id: data.leaderId } : {}),
            ...(data.memberIds !== undefined ? { member_ids: data.memberIds } : {}),
        }),
    });
};

export const addTeamMembers = async (
    id: number,
    memberIds: number[],
): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 팀 멤버 추가 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/teams/${id}/members/`
    await requestVoid(buildAdminUrl(`teams/${id}/members/`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ member_ids: memberIds }),
    });
};

export const changeTeamLeader = async (
    id: number,
    leaderId: number,
): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 팀장 변경 API 준비 후 사용:
    // PATCH `${API_BASE_URL}/admin/teams/${id}/leader/`
    await requestVoid(buildAdminUrl(`teams/${id}/leader/`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ leader_id: leaderId }),
    });
};

export const deleteTeam = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 팀 삭제 API 준비 후 사용:
    // DELETE `${API_BASE_URL}/admin/teams/${id}/`
    await requestVoid(buildAdminUrl(`teams/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
};

export const getRooms = async (): Promise<AdminPracticeRoom[]> => {
    if (!ADMIN_API_READY) return [...mockAdminPracticeRooms];

    // 관리자 합주실 목록 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/rooms/`
    const data = await requestJson<ApiRoom[]>(buildAdminUrl('rooms/'), {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    return data.map(toRoom);
};

export const createRoom = async (
    data: Omit<AdminPracticeRoom, 'id' | 'updatedAt'>,
): Promise<AdminPracticeRoom> => {
    if (!ADMIN_API_READY) {
        return {
            ...data,
            id: Date.now(),
            updatedAt: todayString(),
        };
    }

    // 관리자 합주실 생성 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/rooms/`
    const result = await requestJson<ApiRoom>(buildAdminUrl('rooms/'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            name: data.name,
            description: data.description,
            open_time: data.openTime,
            close_time: data.closeTime,
            is_open_all_day: data.isOpenAllDay,
            sort_order: data.sortOrder,
        }),
    });

    return toRoom(result);
};

export const updateRoom = async (
    id: number,
    data: Partial<Omit<AdminPracticeRoom, 'id' | 'updatedAt'>>,
): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 합주실 수정 API 준비 후 사용:
    // PATCH `${API_BASE_URL}/admin/rooms/${id}/`
    await requestVoid(buildAdminUrl(`rooms/${id}/`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.openTime !== undefined ? { open_time: data.openTime } : {}),
            ...(data.closeTime !== undefined ? { close_time: data.closeTime } : {}),
            ...(data.isOpenAllDay !== undefined
                ? { is_open_all_day: data.isOpenAllDay }
                : {}),
        }),
    });
};

export const deleteRoom = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 합주실 삭제 API 준비 후 사용:
    // DELETE `${API_BASE_URL}/admin/rooms/${id}/`
    await requestVoid(buildAdminUrl(`rooms/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
};

export const getDayOffs = async (): Promise<AdminRoomDayOff[]> => {
    if (!ADMIN_API_READY) return [...mockAdminRoomDayOffs];

    // 관리자 쉬는날 목록 API 준비 후 사용:
    // GET `${API_BASE_URL}/admin/dayoffs/`
    const data = await requestJson<ApiDayOff[]>(buildAdminUrl('dayoffs/'), {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    return data.map(toDayOff);
};

export const checkDayOffConflicts = async (
    draft: AdminRoomDayOffDraft,
): Promise<AdminRoomAffectedReservation[]> => {
    if (!ADMIN_API_READY) return mockCheckRoomDayOffConflicts(draft);

    // 관리자 쉬는날 충돌 검사 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/dayoffs/check-conflicts/`
    const data = await requestJson<ApiAffectedReservation[]>(
        buildAdminUrl('dayoffs/check-conflicts/'),
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                target_type: draft.targetType,
                room_name: draft.targetType === 'single' ? draft.roomName : null,
                date_label: draft.dateLabel,
                end_date_label: draft.endDateLabel,
                type: draft.type,
                is_all_day: draft.isAllDay,
                start_time: draft.startTime,
                end_time: draft.endTime,
            }),
        },
    );

    return data.map(toAffectedReservation);
};

export const createDayOff = async (
    draft: AdminRoomDayOffDraft,
    forceCancelIds: number[] = [],
): Promise<AdminRoomDayOff> => {
    if (!ADMIN_API_READY) {
        const isVacation = draft.type === '휴무';
        const dateLabel = isVacation
            ? `${draft.dateLabel} ~ ${draft.endDateLabel}`
            : draft.dateLabel;
        const timeLabel = isVacation || draft.isAllDay
            ? '하루전체'
            : `${draft.startTime}~${draft.endTime}`;

        return {
            id: Date.now(),
            roomName: draft.targetType === 'all' ? '전체 합주실' : draft.roomName,
            dateLabel,
            timeLabel,
            type: draft.type,
            reason: draft.reason.trim() || '사유 없음',
        };
    }

    // 관리자 쉬는날 생성 API 준비 후 사용:
    // POST `${API_BASE_URL}/admin/dayoffs/`
    const result = await requestJson<ApiDayOff>(buildAdminUrl('dayoffs/'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            target_type: draft.targetType,
            room_name: draft.targetType === 'single' ? draft.roomName : null,
            date_label: draft.dateLabel,
            end_date_label: draft.endDateLabel,
            type: draft.type,
            is_all_day: draft.isAllDay,
            start_time: draft.startTime,
            end_time: draft.endTime,
            reason: draft.reason,
            force_cancel_reservation_ids: forceCancelIds,
        }),
    });

    return toDayOff(result);
};

export const deleteDayOff = async (id: number): Promise<void> => {
    if (!ADMIN_API_READY) return;

    // 관리자 쉬는날 삭제 API 준비 후 사용:
    // DELETE `${API_BASE_URL}/admin/dayoffs/${id}/`
    await requestVoid(buildAdminUrl(`dayoffs/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
};
