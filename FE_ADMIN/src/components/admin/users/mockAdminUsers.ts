import type {
  AdminManagedTeam,
  AdminManagedUser,
  AdminTeamColor,
  AdminTeamLeaderFilterOption,
} from "./types";

export const mockTeamColors: AdminTeamColor[] = [
  { id: "red", name: "레드", value: "#EF4444", available: true },
  { id: "orange", name: "오렌지", value: "#F59E0B", available: true },
  { id: "yellow", name: "옐로", value: "#FACC15", available: false },
  { id: "green", name: "그린", value: "#84CC16", available: true },
  { id: "mint", name: "민트", value: "#2DD4BF", available: true },
  { id: "blue", name: "블루", value: "#3B82F6", available: true },
  { id: "purple", name: "퍼플", value: "#8B5CF6", available: false },
  { id: "pink", name: "핑크", value: "#EC4899", available: true },
  { id: "gray", name: "그레이", value: "#6B7280", available: false },
];

export const mockAdminUsers: AdminManagedUser[] = [
  {
    id: 1,
    nickname: "김민준",
    email: "minjun.kim@example.com",
    status: "normal",
    joinedAt: "2026.03.14",
    teams: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 2,
    nickname: "서연우",
    email: "yeonwoo.seo@example.com",
    status: "normal",
    joinedAt: "2026.03.21",
    teams: [2],
  },
  {
    id: 3,
    nickname: "박지훈",
    email: "jihoon.park@example.com",
    status: "blocked",
    joinedAt: "2026.04.02",
    teams: [3],
  },
  {
    id: 4,
    nickname: "이수빈",
    email: "subin.lee@example.com",
    status: "normal",
    joinedAt: "2026.04.08",
    teams: [4],
  },
  {
    id: 5,
    nickname: "최하늘",
    email: "haneul.choi@example.com",
    status: "normal",
    joinedAt: "2026.04.18",
    teams: [],
  },
  {
    id: 6,
    nickname: "정하린",
    email: "harin.jung@example.com",
    status: "normal",
    joinedAt: "2026.05.01",
    teams: [],
  },
  {
    id: 7,
    nickname: "최유진",
    email: "yujin.choi@example.com",
    status: "normal",
    joinedAt: "2026.05.06",
    teams: [1],
  },
];

export const mockAdminTeams: AdminManagedTeam[] = [
  {
    id: 1,
    name: "A팀",
    colorId: "blue",
    leaderId: 1,
    memberIds: [1, 2, 3, 4, 5],
    updatedAt: "2026.05.13",
  },
  {
    id: 2,
    name: "B팀",
    colorId: "purple",
    leaderId: 2,
    memberIds: [1, 2, 6, 7],
    updatedAt: "2026.05.12",
  },
  {
    id: 3,
    name: "C팀",
    colorId: "mint",
    leaderId: 3,
    memberIds: [1, 3, 5],
    updatedAt: "2026.05.11",
  },
  {
    id: 4,
    name: "D팀",
    colorId: "orange",
    leaderId: 4,
    memberIds: [1, 4],
    updatedAt: "2026.05.10",
  },
  {
    id: 5,
    name: "E팀",
    colorId: "pink",
    leaderId: 5,
    memberIds: [1, 5],
    updatedAt: "2026.05.09",
  },
  {
    id: 6,
    name: "F팀",
    colorId: "green",
    leaderId: 7,
    memberIds: [1, 7],
    updatedAt: "2026.05.08",
  },
];

export const fetchAvailableTeamColors = async () => mockTeamColors;

export const fetchTeamLeaderFilterOptions = async (
  teams: AdminManagedTeam[] = mockAdminTeams,
  users: AdminManagedUser[] = mockAdminUsers,
): Promise<AdminTeamLeaderFilterOption[]> => {
  const leaderIds = Array.from(new Set(teams.map((team) => team.leaderId)));

  return leaderIds
    .map((leaderId) => {
      if (leaderId === 0) {
        return { id: 0, nickname: "사장님" };
      }

      const user = users.find((currentUser) => currentUser.id === leaderId);

      return user ? { id: user.id, nickname: user.nickname } : null;
    })
    .filter((leader): leader is AdminTeamLeaderFilterOption => Boolean(leader));
};
