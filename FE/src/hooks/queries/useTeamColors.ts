import { useQuery } from '@tanstack/react-query';

import { getTeamColors } from '../../apis/teamApi';
import type { TeamColorOption } from '../../types/team';

interface UseTeamColorsParams {
    teamId?: number;
    accessToken?: string | null;
    enabled?: boolean;
}

export const teamColorQueryKeys = {
    all: ['teamColors'] as const,
    list: (teamId?: number) =>
        [...teamColorQueryKeys.all, teamId ?? 'all'] as const,
};

export const useTeamColors = ({
    teamId,
    accessToken,
    enabled = true,
}: UseTeamColorsParams) => {
    return useQuery<TeamColorOption[], Error>({
        queryKey: teamColorQueryKeys.list(teamId),
        queryFn: () => getTeamColors({ teamId, accessToken: accessToken ?? undefined }),
        enabled: enabled && !!accessToken,
        staleTime: 1000 * 60,
    });
};
