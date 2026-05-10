export type TeamRole = 'LEADER' | 'MEMBER';

export interface TeamMember {
    id: number;
    nickname: string;
    role: TeamRole;
}

export interface TeamSummary {
    id: number;
    name: string;
    color: string;
}
