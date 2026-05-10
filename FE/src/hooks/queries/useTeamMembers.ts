import { useQuery } from '@tanstack/react-query';

import { getTeamMembers } from '../../apis/teamApi';
import type { TeamMember } from '../../types/team';

interface UseTeamMembersParams {
    teamId?: number;
    accessToken?: string;
    enabled?: boolean;
}

export const teamMemberQueryKeys = {
    all: ['teamMembers'] as const,
    list: (teamId?: number) =>
        [...teamMemberQueryKeys.all, teamId ?? 'unknown'] as const,
};

export const useTeamMembers = ({
    teamId,
    accessToken,
    enabled = true,
}: UseTeamMembersParams) => {
    return useQuery<TeamMember[], Error>({
        queryKey: teamMemberQueryKeys.list(teamId),
        queryFn: () => {
            if (!teamId) {
                throw new Error('teamId는 필수입니다.');
            }

            return getTeamMembers({ teamId, accessToken });
        },
        enabled: enabled && !!teamId,
        staleTime: 1000 * 60,
    });
};
