import { TEAM_ROLE } from '../../types/team';
import type { TeamMember, TeamSummary } from '../../types/team';

export type TeamListItem = Pick<TeamSummary, 'id' | 'name'>;

export const MOCK_TEAMS: TeamListItem[] = [
    { id: 1, name: '[내가속한팀명1]' },
    { id: 2, name: '[내가속한팀명2]' },
];

const MOCK_TEAM_MEMBER_FIXTURES: TeamMember[] = [
    {
        id: 1,
        nickname: '[멤버1닉네임표시]',
        role: TEAM_ROLE.leader,
    },
    {
        id: 2,
        nickname: '[멤버2닉네임표시]',
        role: TEAM_ROLE.member,
    },
    {
        id: 3,
        nickname: '[멤버3닉네임표시]',
        role: TEAM_ROLE.member,
    },
    {
        id: 4,
        nickname: '[멤버4닉네임표시]',
        role: TEAM_ROLE.member,
    },
    {
        id: 5,
        nickname: '[멤버5닉네임표시]',
        role: TEAM_ROLE.member,
    },
];

export const MOCK_TEAM_MEMBERS =
    MOCK_TEAM_MEMBER_FIXTURES.slice(0, 3);

export const MOCK_TEAM_INFO = {
    id: 1,
    name: '[내가속한팀명1]',
    color: '#06d6a0',
    description: '[내가속한팀명1] 멤버를 확인할 수 있어요.',
} as const;

export const MOCK_CURRENT_LEADER =
    MOCK_TEAM_MEMBER_FIXTURES.find(
        (member) => member.role === TEAM_ROLE.leader,
    ) ?? MOCK_TEAM_MEMBER_FIXTURES[0];

export const MOCK_LEADER_CANDIDATES =
    MOCK_TEAM_MEMBER_FIXTURES.filter(
        (member) => member.role === TEAM_ROLE.member,
    );
