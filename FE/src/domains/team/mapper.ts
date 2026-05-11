import type {
    TeamConfigApiResponse,
    TeamMemberListApiResponse,
} from '../../types/teamSchemas';
import type { TeamMember, TeamSummary } from '../../types/team';

export const mapTeamMembersResponse = ({
    members,
}: TeamMemberListApiResponse): TeamMember[] =>
    members.map((member) => ({
        id: member.id,
        nickname: member.nickname,
        role: member.role,
    }));

export const mapTeamConfigResponse = ({
    id,
    name,
    color,
}: TeamConfigApiResponse): TeamSummary => ({
    id,
    name,
    color: color.startsWith('#') ? color : `#${color}`,
});
