import {
    ACCESS_TOKEN_KEY,
    API_BASE_URL,
} from '../constants/env';
import { getJwtUserId, resolveAdminAccessToken } from './adminApiAuth';
import type {
    AdminLogCategory,
    AdminLogEntry,
} from '../components/admin/logs/AdminLogPanel';
import type {
    AdminReservation,
    AdminReservationConflict,
    NewAdminReservation,
} from '../components/admin/reservations/types';
import type {
    AdminPracticeRoom,
    AdminRoomAffectedReservation,
    AdminRoomDayOff,
    AdminRoomDayOffDraft,
} from '../components/admin/rooms/types';
import type {
    AdminManagedTeam,
    AdminManagedUser,
    AdminTeamColor,
    AdminTeamMemberEditList,
    AdminTeamMemberEditUser,
    AdminTeamLeaderFilterOption,
} from '../components/admin/users/types';
import {
    type AdminResponse,
    type ApiConflict,
    type ApiDayOff,
    type ApiReservation,
    type ApiRoom,
    type ApiTeam,
    type ApiUser,
    toAffectedReservation,
    toConflict,
    toDayOff,
    toReservation,
    toRoom,
    toTeam,
    toUser,
    unwrapAdminResponse,
} from './adminApiMapper';

type ApiTeamColor = {
    id: number;
    name: string;
    value: string;
    available: boolean;
};

type ApiTeamMember = {
    id: number;
    nickname?: string | null;
    email?: string | null;
    status: 'normal' | 'blocked';
    is_leader: boolean;
};

type ApiTeamMemberEditList = {
    members: ApiTeamMember[];
    non_members: ApiTeamMember[];
};

type ApiLog = {
    id: number;
    category: AdminLogCategory;
    action: string;
    target: string;
    detail: string;
    created_at: string;
};

type ApiAdminMe = {
    is_staff: boolean;
};

const ADMIN_API_MESSAGE = {
    requestError: '관리자 API 요청에 실패했습니다.',
    roomNotFound: '선택한 합주실 정보를 찾을 수 없습니다.',
} as const;

let cachedRooms: AdminPracticeRoom[] = [];

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

const buildAdminUrl = (
    path = '',
    searchParams?: URLSearchParams,
): string => {
    const baseUrl = API_BASE_URL.replace(/\/+$/g, '');
    const adminPath = trimSlashes(path);
    const url = `${baseUrl}/admin${adminPath ? `/${adminPath}` : ''}`;
    const queryString = searchParams?.toString();

    return queryString ? `${url}?${queryString}` : url;
};

const getAuthHeaders = (): HeadersInit => {
    const accessToken = resolveAdminAccessToken(
        import.meta.env.VITE_ACCESS_TOKEN_KEY,
        localStorage.getItem(ACCESS_TOKEN_KEY),
    );

    return {
        'Content-Type': 'application/json',
        ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
    };
};

const getAdminUserId = (): number | undefined => {
    const accessToken = resolveAdminAccessToken(
        import.meta.env.VITE_ACCESS_TOKEN_KEY,
        localStorage.getItem(ACCESS_TOKEN_KEY),
    );

    return accessToken ? getJwtUserId(accessToken) : undefined;
};

const requestJson = async <T>(
    path: string,
    init: RequestInit = {},
    searchParams?: URLSearchParams,
): Promise<T> => {
    const response = await fetch(buildAdminUrl(path, searchParams), {
        ...init,
        headers: {
            ...getAuthHeaders(),
            ...init.headers,
        },
    });

    if (!response.ok) {
        throw new Error(
            `${ADMIN_API_MESSAGE.requestError} (status: ${response.status})`,
        );
    }

    const data = (await response.json()) as AdminResponse<T>;

    return unwrapAdminResponse(data);
};

const requestVoid = async (
    path: string,
    init: RequestInit = {},
): Promise<void> => {
    await requestJson<unknown>(path, init);
};

const toApiDate = (dateLabel: string): string => dateLabel.replaceAll('.', '-');

const toTeamMemberEditUser = (
    user: ApiTeamMember,
    isMember: boolean,
): AdminTeamMemberEditUser => ({
    id: user.id,
    nickname: user.nickname || '이름 없음',
    email: user.email || '',
    status: user.status,
    isLeader: user.is_leader,
    isMember,
});

const toTeamMemberEditList = (
    data: ApiTeamMemberEditList,
): AdminTeamMemberEditList => ({
    members: data.members.map((user) => toTeamMemberEditUser(user, true)),
    nonMembers: data.non_members.map((user) =>
        toTeamMemberEditUser(user, false),
    ),
});

const formatLogTime = (value: string): string => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value.replace('T', ' ').slice(0, 16).replaceAll('-', '.');
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}.${month}.${day} ${hour}:${minute}`;
};

const getRoomIdByName = async (roomName: string): Promise<number> => {
    const room =
        cachedRooms.find((currentRoom) => currentRoom.name === roomName) ??
        (await getRooms()).find((currentRoom) => currentRoom.name === roomName);

    if (!room) {
        throw new Error(ADMIN_API_MESSAGE.roomNotFound);
    }

    return room.id;
};

const toRoomRequest = (
    data: Omit<AdminPracticeRoom, 'id' | 'updatedAt'>,
) => ({
    name: data.name,
    description: data.description,
    open_time: data.openTime,
    close_time: data.closeTime,
    is_open_all_day: data.isOpenAllDay,
});

const toDayOffRequest = async (
    draft: AdminRoomDayOffDraft,
    forceCancelIds: number[] = [],
) => {
    const isVacation = draft.type === '휴무';
    const isAllDay = isVacation || draft.isAllDay;
    const roomId =
        draft.targetType === 'single'
            ? await getRoomIdByName(draft.roomName)
            : null;

    return {
        room_id: roomId,
        type: draft.type,
        start_date: toApiDate(draft.dateLabel),
        end_date: toApiDate(isVacation ? draft.endDateLabel : draft.dateLabel),
        start_time: isAllDay ? null : draft.startTime,
        end_time: isAllDay ? null : draft.endTime,
        is_all_day: isAllDay,
        reason: draft.reason,
        force_cancel_reservation_ids: forceCancelIds,
    };
};

export const getReservations = async (): Promise<AdminReservation[]> => {
    const [pendingReservations, approvedReservations] = await Promise.all([
        requestJson<ApiReservation[]>(
            'reservations',
            { method: 'GET' },
            new URLSearchParams({
                status: 'pending',
                page_size: '100',
            }),
        ),
        requestJson<ApiReservation[]>(
            'reservations',
            { method: 'GET' },
            new URLSearchParams({
                status: 'approved',
                date_range: '90',
                team_type: 'all',
                page_size: '100',
            }),
        ),
    ]);

    const adminUserId = getAdminUserId();

    return [...pendingReservations, ...approvedReservations].map((reservation) =>
        toReservation(reservation, new Date(), adminUserId),
    );
};

export const checkAdminAccess = async (): Promise<boolean> => {
    const data = await requestJson<ApiAdminMe>('me', { method: 'GET' });

    return data.is_staff;
};

export const approveReservation = async (id: number): Promise<void> => {
    await requestVoid(`reservations/${id}/approve`, { method: 'PATCH' });
};

export const cancelReservation = async (id: number): Promise<void> => {
    await requestVoid(`reservations/${id}/cancel`, { method: 'PATCH' });
};

export const cancelOccurrences = async (
    id: number,
    dates: string[],
): Promise<void> => {
    await requestVoid(`reservations/${id}/cancel-occurrences`, {
        method: 'PATCH',
        body: JSON.stringify({ dates }),
    });
};

export const checkReservationConflicts = async (
    reservation: NewAdminReservation,
): Promise<AdminReservationConflict[]> => {
    const roomId = await getRoomIdByName(reservation.room);
    const searchParams = new URLSearchParams({
        room_id: String(roomId),
        date: reservation.date,
        start_time: reservation.startTime,
        end_time: reservation.endTime,
    });
    const conflicts = await requestJson<ApiConflict[]>(
        'reservations/conflicts',
        { method: 'GET' },
        searchParams,
    );

    return conflicts.map(toConflict);
};

export const createReservation = async (
    reservation: NewAdminReservation,
    canceledConflictIds: number[] = [],
): Promise<AdminReservation> => {
    const roomId = await getRoomIdByName(reservation.room);
    const created = await requestJson<ApiReservation>('reservations', {
        method: 'POST',
        body: JSON.stringify({
            date: reservation.date,
            start_time: reservation.startTime,
            end_time: reservation.endTime,
            end_next_day: false,
            room_id: roomId,
            team_id: reservation.teamId ?? null,
            title: reservation.title,
            memo: reservation.memo,
            force_cancel_conflict_ids: canceledConflictIds,
        }),
    });

    return toReservation(created, new Date(), getAdminUserId());
};

export const getUsers = async (): Promise<AdminManagedUser[]> => {
    const users = await requestJson<ApiUser[]>(
        'users',
        { method: 'GET' },
        new URLSearchParams({ page_size: '100' }),
    );

    const adminUserId = getAdminUserId();

    return users.map((user) => toUser(user, adminUserId));
};

export const blockUser = async (id: number): Promise<void> => {
    await requestVoid(`users/${id}/block`, { method: 'PATCH' });
};

export const unblockUser = async (id: number): Promise<void> => {
    await requestVoid(`users/${id}/unblock`, { method: 'PATCH' });
};

export const getTeams = async (): Promise<AdminManagedTeam[]> => {
    const teams = await requestJson<ApiTeam[]>(
        'teams',
        { method: 'GET' },
        new URLSearchParams({ page_size: '100' }),
    );
    const teamDetails = await Promise.all(
        teams.map((team) =>
            requestJson<ApiTeam>(`teams/${team.id}`, { method: 'GET' }).catch(
                () => team,
            ),
        ),
    );

    return teamDetails.map(toTeam);
};

export const getTeamColors = async (
    currentTeamId?: number,
): Promise<AdminTeamColor[]> => {
    const searchParams = new URLSearchParams();

    if (currentTeamId != null) {
        searchParams.set('team_id', String(currentTeamId));
    }

    const colors = await requestJson<ApiTeamColor[]>(
        'teams/colors',
        { method: 'GET' },
        searchParams,
    );

    return colors.map((color) => ({
        id: String(color.id),
        name: color.name,
        value: color.value,
        available: color.available,
    }));
};

export const getTeamLeaderOptions = async (
    teams: AdminManagedTeam[],
    users: AdminManagedUser[],
): Promise<AdminTeamLeaderFilterOption[]> => {
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
};

export const createTeam = async (data: {
    name: string;
    colorId: string;
    leaderId: number;
    memberIds: number[];
}): Promise<AdminManagedTeam> => {
    const team = await requestJson<ApiTeam>('teams', {
        method: 'POST',
        body: JSON.stringify({
            name: data.name,
            color_id: Number(data.colorId),
            leader_id: data.leaderId,
        }),
    });

    return toTeam(team);
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
    await requestVoid(`teams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.colorId !== undefined
                ? { color_id: Number(data.colorId) }
                : {}),
        }),
    });
};

export const addTeamMembers = async (
    id: number,
    memberIds: number[],
): Promise<void> => {
    await requestVoid(`teams/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_ids: memberIds }),
    });
};

export const getTeamMemberEditList = async (
    id: number,
): Promise<AdminTeamMemberEditList> => {
    const data = await requestJson<ApiTeamMemberEditList>(
        `teams/${id}/members`,
        { method: 'GET' },
    );

    return toTeamMemberEditList(data);
};

export const updateTeamMembers = async (
    id: number,
    memberIds: number[],
): Promise<AdminTeamMemberEditList> => {
    const data = await requestJson<ApiTeamMemberEditList>(
        `teams/${id}/members`,
        {
            method: 'PATCH',
            body: JSON.stringify({ user_ids: memberIds }),
        },
    );

    return toTeamMemberEditList(data);
};

export const changeTeamLeader = async (
    id: number,
    leaderId: number,
): Promise<void> => {
    await requestVoid(`teams/${id}/leader`, {
        method: 'PATCH',
        body: JSON.stringify({ leader_id: leaderId }),
    });
};

export const deleteTeam = async (id: number): Promise<void> => {
    await requestVoid(`teams/${id}`, { method: 'DELETE' });
};

export const getRooms = async (): Promise<AdminPracticeRoom[]> => {
    const rooms = await requestJson<ApiRoom[]>(
        'rooms',
        { method: 'GET' },
        new URLSearchParams({ include_inactive: 'true' }),
    );

    cachedRooms = rooms.map(toRoom);

    return cachedRooms;
};

export const createRoom = async (
    data: Omit<AdminPracticeRoom, 'id' | 'updatedAt'>,
): Promise<AdminPracticeRoom> => {
    const room = await requestJson<ApiRoom>('rooms', {
        method: 'POST',
        body: JSON.stringify(toRoomRequest(data)),
    });
    const created = toRoom(room);
    cachedRooms = [...cachedRooms, created];

    return created;
};

export const updateRoom = async (
    id: number,
    data: Partial<Omit<AdminPracticeRoom, 'id' | 'updatedAt'>>,
): Promise<void> => {
    const currentRoom = cachedRooms.find((room) => room.id === id);

    await requestVoid(`rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(
            toRoomRequest({
                name: data.name ?? currentRoom?.name ?? '',
                description: data.description ?? currentRoom?.description ?? '',
                openTime: data.openTime ?? currentRoom?.openTime ?? '09:00',
                closeTime: data.closeTime ?? currentRoom?.closeTime ?? '23:00',
                isOpenAllDay:
                    data.isOpenAllDay ?? currentRoom?.isOpenAllDay ?? false,
                isActive: data.isActive ?? currentRoom?.isActive ?? true,
                sortOrder: data.sortOrder ?? currentRoom?.sortOrder ?? 0,
            }),
        ),
    });
};

export const deleteRoom = async (id: number): Promise<void> => {
    await requestVoid(`rooms/${id}`, { method: 'DELETE' });
};

export const getDayOffs = async (): Promise<AdminRoomDayOff[]> => {
    const dayOffs = await requestJson<ApiDayOff[]>(
        'rooms/day-offs',
        { method: 'GET' },
        new URLSearchParams({ page_size: '100' }),
    );

    return dayOffs.map(toDayOff);
};

export const checkDayOffConflicts = async (
    draft: AdminRoomDayOffDraft,
): Promise<AdminRoomAffectedReservation[]> => {
    const conflicts = await requestJson<ApiConflict[]>(
        'rooms/day-offs/conflict-check',
        {
            method: 'POST',
            body: JSON.stringify(await toDayOffRequest(draft)),
        },
    );

    return conflicts.map(toAffectedReservation);
};

export const createDayOff = async (
    draft: AdminRoomDayOffDraft,
    forceCancelIds: number[] = [],
): Promise<AdminRoomDayOff> => {
    const dayOff = await requestJson<ApiDayOff>('rooms/day-offs', {
        method: 'POST',
        body: JSON.stringify(await toDayOffRequest(draft, forceCancelIds)),
    });

    return toDayOff(dayOff);
};

export const deleteDayOff = async (id: number): Promise<void> => {
    await requestVoid(`rooms/day-offs/${id}`, { method: 'DELETE' });
};

export const getLogs = async (): Promise<AdminLogEntry[]> => {
    const logs = await requestJson<ApiLog[]>(
        'logs',
        { method: 'GET' },
        new URLSearchParams({ page_size: '100' }),
    );

    return logs.map((log) => ({
        id: log.id,
        category: log.category,
        action: log.action,
        target: log.target,
        detail: log.detail,
        createdAt: formatLogTime(log.created_at),
    }));
};
