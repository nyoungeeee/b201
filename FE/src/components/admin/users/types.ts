export type AdminUserStatus = "normal" | "blocked";

export type AdminTeamColor = {
  id: string;
  name: string;
  value: string;
  available: boolean;
};

export type AdminManagedUser = {
  id: number;
  nickname: string;
  email: string;
  status: AdminUserStatus;
  joinedAt: string;
  teams: number[];
};

export type AdminManagedTeam = {
  id: number;
  name: string;
  colorId: string;
  leaderId: number;
  memberIds: number[];
  updatedAt: string;
};

export type AdminTeamMemberEditUser = {
  id: number;
  nickname: string;
  email: string;
  status: AdminUserStatus;
  isLeader: boolean;
  isMember: boolean;
};

export type AdminTeamMemberEditList = {
  members: AdminTeamMemberEditUser[];
  nonMembers: AdminTeamMemberEditUser[];
};

export type AdminTeamLeaderFilterOption = {
  id: number;
  nickname: string;
};
