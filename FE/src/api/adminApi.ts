/**
 * 관리자 API 레이어
 *
 * VITE_ADMIN_API_BASE_URL 환경변수가 설정되면 실제 API 호출,
 * 설정되지 않으면 mock 데이터를 반환하는 mock 모드로 동작합니다.
 */

import type { AdminReservation, AdminReservationConflict, NewAdminReservation } from "../components/admin/reservations/types";
import type { AdminManagedUser, AdminManagedTeam, AdminTeamColor, AdminTeamLeaderFilterOption } from "../components/admin/users/types";
import type { AdminPracticeRoom, AdminRoomDayOff, AdminRoomDayOffDraft, AdminRoomAffectedReservation } from "../components/admin/rooms/types";

// Mock 데이터 import
import { mockAdminReservations } from "../components/admin/reservations/mockReservations";
import { mockAdminUsers, mockAdminTeams, mockTeamColors } from "../components/admin/users/mockAdminUsers";
import { mockAdminPracticeRooms, mockAdminRoomDayOffs, mockCheckRoomDayOffConflicts } from "../components/admin/rooms/mockAdminRooms";

// ── 설정 ──────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined) ?? "";
const USE_MOCK = !BASE_URL;

// ── HTTP 헬퍼 ─────────────────────────────────────────────────────────
const getAuthHeader = (): Record<string, string> => {
  const token =
    localStorage.getItem("access_token") ??
    (import.meta.env.VITE_ACCESS_TOKEN_KEY as string | undefined) ??
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

// ── 날짜/시간 변환 유틸 ───────────────────────────────────────────────
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

function toDateLabel(kind: string, date: string, repeatWeekdays: number[] | null): string {
  if (kind === "repeat" && repeatWeekdays && repeatWeekdays.length > 0) {
    return `매주 ${repeatWeekdays.map((d) => WEEKDAY_SHORT[d]).join("/")}`;
  }
  const d = new Date(`${date}T00:00:00`);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}.${day} (${WEEKDAY_SHORT[d.getDay()]})`;
}

function toPeriodLabel(start: string | null, end: string | null): string | undefined {
  if (!start || !end) return undefined;
  const [, sm, sd] = start.split("-");
  const [, em, ed] = end.split("-");
  return `${sm}.${sd}~${em}.${ed}`;
}

function toDayOffset(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
}

// ── API 응답 타입 (snake_case) ─────────────────────────────────────────
type ApiReservation = {
  id: number;
  status: "pending" | "approved";
  kind: "single" | "repeat";
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
  status: "normal" | "blocked";
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
  type: "휴무" | "점검" | "기타";
  reason: string;
};

type ApiConflict = {
  id: number;
  room: string;
  date: string;
  time_label: string;
  owner_label: string;
  status: "pending" | "approved";
};

type ApiAffectedReservation = {
  id: number;
  room_name: string;
  date_time: string;
  reserver: string;
  status: "승인 완료" | "승인 대기";
};

// ── 응답 변환 함수 ────────────────────────────────────────────────────
function toReservation(r: ApiReservation): AdminReservation {
  return {
    id: r.id,
    status: r.status,
    kind: r.kind,
    dateLabel: toDateLabel(r.kind, r.date, r.repeat_weekdays),
    dayOffset: toDayOffset(r.date),
    timeLabel: r.end_next_day
      ? `${r.start_time}~다음날 ${r.end_time}`
      : `${r.start_time}~${r.end_time}`,
    periodLabel: toPeriodLabel(r.repeat_start_date, r.repeat_end_date),
    room: r.room_name,
    teamId: r.team_id ?? undefined,
    teamName: r.team_name ?? undefined,
    reserverUserId: r.reserver_user_id ?? undefined,
    reserverName: r.reserver_name,
    memo: r.memo ?? undefined,
    canceledOccurrenceDates: r.canceled_occurrence_dates,
  };
}

function toUser(u: ApiUser): AdminManagedUser {
  return {
    id: u.id,
    nickname: u.nickname,
    email: u.email,
    status: u.status,
    joinedAt: u.joined_at,
    teams: u.team_ids,
  };
}

function toTeam(t: ApiTeam): AdminManagedTeam {
  return {
    id: t.id,
    name: t.name,
    colorId: t.color_id,
    leaderId: t.leader_id,
    memberIds: t.member_ids,
    updatedAt: t.updated_at,
  };
}

function toRoom(r: ApiRoom): AdminPracticeRoom {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    openTime: r.open_time,
    closeTime: r.close_time,
    isOpenAllDay: r.is_open_all_day,
    isActive: r.is_active,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  };
}

function toDayOff(d: ApiDayOff): AdminRoomDayOff {
  return {
    id: d.id,
    roomName: d.room_name,
    dateLabel: d.date_label,
    timeLabel: d.time_label,
    type: d.type,
    reason: d.reason,
  };
}

function toConflict(c: ApiConflict): AdminReservationConflict {
  return {
    id: c.id,
    room: c.room,
    date: c.date,
    timeLabel: c.time_label,
    ownerLabel: c.owner_label,
    status: c.status,
  };
}

function toAffectedReservation(r: ApiAffectedReservation): AdminRoomAffectedReservation {
  return {
    id: r.id,
    roomName: r.room_name,
    dateTime: r.date_time,
    reserver: r.reserver,
    status: r.status,
  };
}

// ── 예약 API ──────────────────────────────────────────────────────────
export const getReservations = async (): Promise<AdminReservation[]> => {
  if (USE_MOCK) return [...mockAdminReservations];
  const data = await apiFetch<ApiReservation[]>("/reservations");
  return data.map(toReservation);
};

export const approveReservation = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/reservations/${id}/approve`, { method: "POST" });
};

export const cancelReservation = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/reservations/${id}/cancel`, { method: "POST" });
};

export const cancelOccurrences = async (id: number, dates: string[]): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/reservations/${id}/cancel-occurrences`, {
    method: "POST",
    body: JSON.stringify({ dates }),
  });
};

export const checkReservationConflicts = async (
  reservation: NewAdminReservation,
): Promise<AdminReservationConflict[]> => {
  if (USE_MOCK) {
    const hasConflict = reservation.room === "B201" && reservation.date === "2026-05-15";
    if (!hasConflict) return [];
    return [
      { id: 1, room: "B201", date: "2026.05.15", timeLabel: "19:00~21:00", ownerLabel: "팀: 사운드웨이브", status: "approved" },
      { id: 3, room: "B201", date: "2026.05.15", timeLabel: "21:00~22:00", ownerLabel: "개인 예약: 박지훈", status: "approved" },
      { id: 4, room: "B201", date: "2026.05.15", timeLabel: "18:30~19:30", ownerLabel: "팀: 블루코드", status: "pending" },
    ];
  }
  const data = await apiFetch<ApiConflict[]>(
    `/reservations/check-conflicts?room=${encodeURIComponent(reservation.room)}&date=${reservation.date}&start_time=${reservation.startTime}&end_time=${reservation.endTime}`,
  );
  return data.map(toConflict);
};

export const createReservation = async (
  reservation: NewAdminReservation,
  canceledConflictIds: number[] = [],
): Promise<AdminReservation> => {
  if (USE_MOCK) {
    const d = new Date(`${reservation.date}T00:00:00`);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return {
      id: Date.now(),
      status: "approved",
      kind: "single",
      dateLabel: `${m}.${day} (${WEEKDAY_SHORT[d.getDay()]})`,
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
  const data = await apiFetch<ApiReservation>("/reservations", {
    method: "POST",
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
  });
  return toReservation(data);
};

// ── 사용자 API ────────────────────────────────────────────────────────
export const getUsers = async (): Promise<AdminManagedUser[]> => {
  if (USE_MOCK) return [...mockAdminUsers];
  const data = await apiFetch<ApiUser[]>("/users");
  return data.map(toUser);
};

export const blockUser = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/users/${id}/block`, { method: "POST" });
};

export const unblockUser = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/users/${id}/unblock`, { method: "POST" });
};

// ── 팀 API ────────────────────────────────────────────────────────────
export const getTeams = async (): Promise<AdminManagedTeam[]> => {
  if (USE_MOCK) return [...mockAdminTeams];
  const data = await apiFetch<ApiTeam[]>("/teams");
  return data.map(toTeam);
};

export const getTeamColors = async (currentTeamId?: number): Promise<AdminTeamColor[]> => {
  if (USE_MOCK) return [...mockTeamColors];
  const path = currentTeamId != null ? `/teams/colors?team_id=${currentTeamId}` : "/teams/colors";
  return apiFetch<AdminTeamColor[]>(path);
};

export const getTeamLeaderOptions = async (
  teams: AdminManagedTeam[],
  users: AdminManagedUser[],
): Promise<AdminTeamLeaderFilterOption[]> => {
  if (USE_MOCK) {
    const leaderIds = Array.from(new Set(teams.map((t) => t.leaderId)));
    return leaderIds
      .map((id) => {
        if (id === 0) return { id: 0, nickname: "사장님" };
        const user = users.find((u) => u.id === id);
        return user ? { id: user.id, nickname: user.nickname } : null;
      })
      .filter((o): o is AdminTeamLeaderFilterOption => Boolean(o));
  }
  return apiFetch<AdminTeamLeaderFilterOption[]>("/teams/leader-options");
};

export const createTeam = async (data: {
  name: string;
  colorId: string;
  leaderId: number;
  memberIds: number[];
}): Promise<AdminManagedTeam> => {
  if (USE_MOCK) {
    return {
      id: Date.now(),
      name: data.name,
      colorId: data.colorId,
      leaderId: data.leaderId,
      memberIds: data.memberIds,
      updatedAt: todayString(),
    };
  }
  const result = await apiFetch<ApiTeam>("/teams", {
    method: "POST",
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
  data: Partial<{ name: string; colorId: string; leaderId: number; memberIds: number[] }>,
): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<ApiTeam>(`/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.colorId !== undefined ? { color_id: data.colorId } : {}),
      ...(data.leaderId !== undefined ? { leader_id: data.leaderId } : {}),
      ...(data.memberIds !== undefined ? { member_ids: data.memberIds } : {}),
    }),
  });
};

export const deleteTeam = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/teams/${id}`, { method: "DELETE" });
};

// ── 합주실 API ────────────────────────────────────────────────────────
export const getRooms = async (): Promise<AdminPracticeRoom[]> => {
  if (USE_MOCK) return [...mockAdminPracticeRooms];
  const data = await apiFetch<ApiRoom[]>("/rooms");
  return data.map(toRoom);
};

export const createRoom = async (
  data: Omit<AdminPracticeRoom, "id" | "updatedAt">,
): Promise<AdminPracticeRoom> => {
  if (USE_MOCK) {
    return { ...data, id: Date.now(), updatedAt: todayString() };
  }
  const result = await apiFetch<ApiRoom>("/rooms", {
    method: "POST",
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
  data: Partial<Omit<AdminPracticeRoom, "id" | "updatedAt">>,
): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<ApiRoom>(`/rooms/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.openTime !== undefined ? { open_time: data.openTime } : {}),
      ...(data.closeTime !== undefined ? { close_time: data.closeTime } : {}),
      ...(data.isOpenAllDay !== undefined ? { is_open_all_day: data.isOpenAllDay } : {}),
    }),
  });
};

export const deleteRoom = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/rooms/${id}`, { method: "DELETE" });
};

// ── 쉬는날 API ────────────────────────────────────────────────────────
export const getDayOffs = async (): Promise<AdminRoomDayOff[]> => {
  if (USE_MOCK) return [...mockAdminRoomDayOffs];
  const data = await apiFetch<ApiDayOff[]>("/dayoffs");
  return data.map(toDayOff);
};

export const checkDayOffConflicts = async (
  draft: AdminRoomDayOffDraft,
): Promise<AdminRoomAffectedReservation[]> => {
  if (USE_MOCK) return mockCheckRoomDayOffConflicts(draft);
  const data = await apiFetch<ApiAffectedReservation[]>("/dayoffs/check-conflicts", {
    method: "POST",
    body: JSON.stringify({
      target_type: draft.targetType,
      room_name: draft.targetType === "single" ? draft.roomName : null,
      date_label: draft.dateLabel,
      end_date_label: draft.endDateLabel,
      type: draft.type,
      is_all_day: draft.isAllDay,
      start_time: draft.startTime,
      end_time: draft.endTime,
    }),
  });
  return data.map(toAffectedReservation);
};

export const createDayOff = async (
  draft: AdminRoomDayOffDraft,
  forceCancelIds: number[] = [],
): Promise<AdminRoomDayOff> => {
  if (USE_MOCK) {
    const isVacation = draft.type === "휴무";
    const dateLabel = isVacation
      ? `${draft.dateLabel} ~ ${draft.endDateLabel}`
      : draft.dateLabel;
    const timeLabel = isVacation || draft.isAllDay
      ? "하루전체"
      : `${draft.startTime}~${draft.endTime}`;
    return {
      id: Date.now(),
      roomName: draft.targetType === "all" ? "전체 합주실" : draft.roomName,
      dateLabel,
      timeLabel,
      type: draft.type,
      reason: draft.reason.trim() || "사유 없음",
    };
  }
  const result = await apiFetch<ApiDayOff>("/dayoffs", {
    method: "POST",
    body: JSON.stringify({
      target_type: draft.targetType,
      room_name: draft.targetType === "single" ? draft.roomName : null,
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

export const addTeamMembers = async (id: number, memberIds: number[]): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/teams/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ member_ids: memberIds }),
  });
};

export const changeTeamLeader = async (id: number, leaderId: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/teams/${id}/leader`, {
    method: "PATCH",
    body: JSON.stringify({ leader_id: leaderId }),
  });
};

export const deleteDayOff = async (id: number): Promise<void> => {
  if (USE_MOCK) return;
  await apiFetch<void>(`/dayoffs/${id}`, { method: "DELETE" });
};
