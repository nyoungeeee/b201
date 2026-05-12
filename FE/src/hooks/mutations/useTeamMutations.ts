import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    addTeamMember,
    delegateTeamLeader,
    removeTeamMember,
    updateTeamConfig,
} from '../../apis/teamApi';
import { teamDetailQueryKeys } from '../queries/useTeamDetail';
import { teamColorQueryKeys } from '../queries/useTeamColors';
import { teamMemberQueryKeys } from '../queries/useTeamMembers';

interface TeamMutationOptions {
    accessToken?: string;
}

export const useAddTeamMember = ({
    accessToken,
}: TeamMutationOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            teamId,
            nickname,
        }: {
            teamId: number;
            nickname: string;
        }) => addTeamMember({ teamId, nickname, accessToken }),
        onSuccess: (members, { teamId }) => {
            if (members) {
                queryClient.setQueryData(
                    teamMemberQueryKeys.list(teamId),
                    members,
                );
            }

            queryClient.invalidateQueries({
                queryKey: teamDetailQueryKeys.detail(teamId),
            });
        },
    });
};

export const useRemoveTeamMember = ({
    accessToken,
}: TeamMutationOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            teamId,
            memberId,
        }: {
            teamId: number;
            memberId: number;
        }) => removeTeamMember({ teamId, memberId, accessToken }),
        onSuccess: (members, { teamId }) => {
            if (members) {
                queryClient.setQueryData(
                    teamMemberQueryKeys.list(teamId),
                    members,
                );
            }

            queryClient.invalidateQueries({
                queryKey: teamDetailQueryKeys.detail(teamId),
            });
        },
    });
};

export const useDelegateTeamLeader = ({
    accessToken,
}: TeamMutationOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            teamId,
            userId,
        }: {
            teamId: number;
            userId: number;
        }) => delegateTeamLeader({ teamId, userId, accessToken }),
        onSuccess: (_, { teamId }) => {
            queryClient.invalidateQueries({
                queryKey: teamMemberQueryKeys.list(teamId),
            });
            queryClient.invalidateQueries({
                queryKey: teamDetailQueryKeys.detail(teamId),
            });
        },
    });
};

export const useUpdateTeamConfig = ({
    accessToken,
}: TeamMutationOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            teamId,
            name,
            colorId,
        }: {
            teamId: number;
            name?: string;
            colorId?: number;
        }) =>
            updateTeamConfig({
                teamId,
                name,
                colorId,
                accessToken,
            }),
        onSuccess: (_, { teamId }) => {
            queryClient.invalidateQueries({
                queryKey: teamDetailQueryKeys.detail(teamId),
            });
            queryClient.invalidateQueries({
                queryKey: teamColorQueryKeys.list(teamId),
            });
        },
    });
};
