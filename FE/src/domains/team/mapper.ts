import type {
    TeamColorListApiResponse,
    TeamConfigApiResponse,
    TeamDetailApiResponse,
    TeamMemberListApiResponse,
} from '../../types/teamSchemas';
import type {
    TeamColorOption,
    TeamDetail,
    TeamMember,
    TeamSummary,
} from '../../types/team';

const normalizeTeamColor = (color: string) =>
    color.startsWith('#') ? color : `#${color}`;

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
    color_id,
    color,
}: TeamConfigApiResponse): TeamSummary => ({
    id,
    name,
    color: normalizeTeamColor(color),
    colorId: color_id ?? null,
});

export const mapTeamDetailResponse = ({
    id,
    name,
    color_id,
    color,
    members,
    is_leader,
}: TeamDetailApiResponse): TeamDetail => ({
    id,
    name,
    color: normalizeTeamColor(color),
    colorId: color_id ?? null,
    members: mapTeamMembersResponse({ members }),
    isLeader: is_leader,
});

export const mapTeamColorsResponse = ({
    colors,
}: TeamColorListApiResponse): TeamColorOption[] =>
    colors.map((color) => ({
        id: color.id,
        color: normalizeTeamColor(color.color),
        available: color.available,
    }));
