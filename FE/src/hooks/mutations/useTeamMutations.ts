import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    addTeamMember,
    delegateTeamLeader,
    removeTeamMember,
    updateTeamConfig,
} from '../../apis/teamApi';
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
            queryClient.setQueryData(
                teamMemberQueryKeys.list(teamId),
                members,
            );
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
            queryClient.setQueryData(
                teamMemberQueryKeys.list(teamId),
                members,
            );
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
        },
    });
};

export const useUpdateTeamConfig = ({
    accessToken,
}: TeamMutationOptions = {}) => {
    return useMutation({
        mutationFn: ({
            teamId,
            name,
            color,
        }: {
            teamId: number;
            name?: string;
            color?: string;
        }) =>
            updateTeamConfig({
                teamId,
                name,
                color,
                accessToken,
            }),
    });
};
