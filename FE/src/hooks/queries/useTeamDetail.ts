import { useQuery } from '@tanstack/react-query';

import { getTeamDetail } from '../../apis/teamApi';
import type { TeamDetail } from '../../types/team';

interface UseTeamDetailParams {
    teamId?: number;
    accessToken?: string | null;
    enabled?: boolean;
}

export const teamDetailQueryKeys = {
    all: ['teamDetail'] as const,
    detail: (teamId?: number) =>
        [...teamDetailQueryKeys.all, teamId ?? 'unknown'] as const,
};

export const useTeamDetail = ({
    teamId,
    accessToken,
    enabled = true,
}: UseTeamDetailParams) => {
    return useQuery<TeamDetail, Error>({
        queryKey: teamDetailQueryKeys.detail(teamId),
        queryFn: () => {
            if (!teamId) {
                throw new Error('teamId가 필요합니다.');
            }

            if (!accessToken) {
                throw new Error('accessToken이 필요합니다.');
            }

            return getTeamDetail({ teamId, accessToken });
        },
        enabled: enabled && !!teamId && !!accessToken,
        staleTime: 1000 * 60,
    });
};
