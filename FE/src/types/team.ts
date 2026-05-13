export const TEAM_ROLE = {
    leader: 'LEADER',
    member: 'MEMBER',
} as const;

export const TEAM_ROLE_VALUES = [
    TEAM_ROLE.leader,
    TEAM_ROLE.member,
] as const;

export type TeamRole =
    (typeof TEAM_ROLE_VALUES)[number];

export interface TeamMember {
    id: number;
    nickname: string;
    role: TeamRole;
}

export interface TeamSummary {
    id: number;
    name: string;
    color: string;
    colorId?: number | null;
}

export interface TeamDetail extends TeamSummary {
    members: TeamMember[];
    isLeader: boolean;
}

export interface TeamColorOption {
    id: number;
    color: string;
    available: boolean;
}
