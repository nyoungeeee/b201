import { API_BASE_URL } from '../constants/env';
import {
    teamConfigResponseSchema,
    teamMemberListResponseSchema,
} from '../types/teamSchemas';
import type { TeamMember, TeamSummary } from '../types/team';
import {
    mapTeamConfigResponse,
    mapTeamMembersResponse,
} from '../domains/team/mapper';

interface TeamRequestOptions {
    accessToken?: string;
}

interface AddTeamMemberParams extends TeamRequestOptions {
    teamId: number;
    nickname: string;
}

interface RemoveTeamMemberParams extends TeamRequestOptions {
    teamId: number;
    memberId: number;
}

interface DelegateTeamLeaderParams extends TeamRequestOptions {
    teamId: number;
    userId: number;
}

interface UpdateTeamConfigParams extends TeamRequestOptions {
    teamId: number;
    name?: string;
    color?: string;
}

interface GetTeamMembersParams extends TeamRequestOptions {
    teamId: number;
}

const TEAM_API_MESSAGE = {
    membersFetchError: '팀 멤버 조회에 실패했습니다.',
    memberAddError: '팀 멤버 추가에 실패했습니다.',
    memberRemoveError: '팀 멤버 제거에 실패했습니다.',
    leaderDelegateError: '팀 리더 위임에 실패했습니다.',
    configUpdateError: '팀 정보 변경에 실패했습니다.',
    membersResponseError:
        '팀 멤버 응답 형식이 올바르지 않습니다.',
    configResponseError:
        '팀 정보 응답 형식이 올바르지 않습니다.',
} as const;

const buildTeamUrl = (path: string) =>
    `${API_BASE_URL}/teams/${path}`;

const buildHeaders = (
    accessToken?: string,
): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
});

const requestJson = async <T>(
    input: RequestInfo | URL,
    init: RequestInit,
    errorMessage: string,
): Promise<T> => {
    const response = await fetch(input, init);

    if (!response.ok) {
        throw new Error(
            `${errorMessage} (status: ${response.status})`,
        );
    }

    return response.json() as Promise<T>;
};

const parseTeamMembers = (rawData: unknown): TeamMember[] => {
    const parsedResult =
        teamMemberListResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'Team members API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(TEAM_API_MESSAGE.membersResponseError);
    }

    return mapTeamMembersResponse(parsedResult.data);
};

const parseTeamConfig = (rawData: unknown): TeamSummary => {
    const parsedResult =
        teamConfigResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'Team config API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(TEAM_API_MESSAGE.configResponseError);
    }

    return mapTeamConfigResponse(parsedResult.data);
};

export const getTeamMembers = async ({
    teamId,
    accessToken,
}: GetTeamMembersParams): Promise<TeamMember[]> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/members/`),
        {
            method: 'GET',
            headers: buildHeaders(accessToken),
        },
        TEAM_API_MESSAGE.membersFetchError,
    );

    return parseTeamMembers(rawData);
};

export const addTeamMember = async ({
    teamId,
    nickname,
    accessToken,
}: AddTeamMemberParams): Promise<TeamMember[]> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/members/`),
        {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({ nickname }),
        },
        TEAM_API_MESSAGE.memberAddError,
    );

    return parseTeamMembers(rawData);
};

export const removeTeamMember = async ({
    teamId,
    memberId,
    accessToken,
}: RemoveTeamMemberParams): Promise<TeamMember[]> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/members/${memberId}/`),
        {
            method: 'DELETE',
            headers: buildHeaders(accessToken),
        },
        TEAM_API_MESSAGE.memberRemoveError,
    );

    return parseTeamMembers(rawData);
};

export const delegateTeamLeader = async ({
    teamId,
    userId,
    accessToken,
}: DelegateTeamLeaderParams): Promise<TeamSummary> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/leader/`),
        {
            method: 'PATCH',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({ user_id: userId }),
        },
        TEAM_API_MESSAGE.leaderDelegateError,
    );

    return parseTeamConfig(rawData);
};

export const updateTeamConfig = async ({
    teamId,
    name,
    color,
    accessToken,
}: UpdateTeamConfigParams): Promise<TeamSummary> => {
    const body = {
        ...(name !== undefined ? { name } : {}),
        ...(color !== undefined ? { color } : {}),
    };

    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/config/`),
        {
            method: 'PATCH',
            headers: buildHeaders(accessToken),
            body: JSON.stringify(body),
        },
        TEAM_API_MESSAGE.configUpdateError,
    );

    return parseTeamConfig(rawData);
};
