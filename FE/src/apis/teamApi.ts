import { API_BASE_URL } from '../constants/env';
import { authFetch } from './authFetch';
import {
    teamColorListResponseSchema,
    teamConfigResponseSchema,
    teamDetailResponseSchema,
    teamMemberListResponseSchema,
} from '../types/teamSchemas';
import type {
    TeamColorOption,
    TeamDetail,
    TeamMember,
    TeamSummary,
} from '../types/team';
import {
    mapTeamColorsResponse,
    mapTeamConfigResponse,
    mapTeamDetailResponse,
    mapTeamMembersResponse,
} from '../domains/team/mapper';

interface TeamRequestOptions {
    accessToken?: string;
}

interface GetTeamColorsParams extends TeamRequestOptions {
    teamId?: number;
}

interface GetTeamDetailParams extends TeamRequestOptions {
    teamId: number;
}

interface GetTeamMembersParams extends TeamRequestOptions {
    teamId: number;
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
    colorId?: number;
}

const TEAM_API_MESSAGE = {
    colorsFetchError: '팀 색상 목록 조회에 실패했습니다.',
    detailFetchError: '팀 상세 조회에 실패했습니다.',
    membersFetchError: '팀 멤버 조회에 실패했습니다.',
    memberAddError: '팀 멤버 추가에 실패했습니다.',
    memberRemoveError: '팀 멤버 제거에 실패했습니다.',
    leaderDelegateError: '팀 리더 위임에 실패했습니다.',
    configUpdateError: '팀 정보 변경에 실패했습니다.',
    colorsResponseError: '팀 색상 목록 응답 형식이 올바르지 않습니다.',
    detailResponseError: '팀 상세 응답 형식이 올바르지 않습니다.',
    membersResponseError: '팀 멤버 응답 형식이 올바르지 않습니다.',
    configResponseError: '팀 정보 응답 형식이 올바르지 않습니다.',
} as const;

const buildTeamUrl = (path: string) =>
    `${API_BASE_URL}/teams/${path}`;

const buildHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
});

const requestJson = async <T>(
    input: RequestInfo | URL,
    init: RequestInit,
    errorMessage: string,
): Promise<T> => {
    const response = await authFetch(input, init);

    if (!response.ok) {
        throw new Error(
            `${errorMessage} (status: ${response.status})`,
        );
    }

    return response.json() as Promise<T>;
};

const parseTeamColors = (rawData: unknown): TeamColorOption[] => {
    const parsedResult =
        teamColorListResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'Team colors API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(TEAM_API_MESSAGE.colorsResponseError);
    }

    return mapTeamColorsResponse(parsedResult.data);
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

const parseTeamDetail = (rawData: unknown): TeamDetail => {
    const parsedResult =
        teamDetailResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'Team detail API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(TEAM_API_MESSAGE.detailResponseError);
    }

    return mapTeamDetailResponse(parsedResult.data);
};

export const getTeamColors = async ({
    teamId,
}: GetTeamColorsParams): Promise<TeamColorOption[]> => {
    const searchParams = new URLSearchParams();

    if (teamId) {
        searchParams.set('team_id', String(teamId));
    }

    const queryString = searchParams.toString();

    const rawData = await requestJson<unknown>(
        `${buildTeamUrl('colors/')}${queryString ? `?${queryString}` : ''}`,
        {
            method: 'GET',
            headers: buildHeaders(),
        },
        TEAM_API_MESSAGE.colorsFetchError,
    );

    return parseTeamColors(rawData);
};

export const getTeamDetail = async ({
    teamId,
}: GetTeamDetailParams): Promise<TeamDetail> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/`),
        {
            method: 'GET',
            headers: buildHeaders(),
        },
        TEAM_API_MESSAGE.detailFetchError,
    );

    return parseTeamDetail(rawData);
};

export const getTeamMembers = async ({
    teamId,
}: GetTeamMembersParams): Promise<TeamMember[]> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/members/`),
        {
            method: 'GET',
            headers: buildHeaders(),
        },
        TEAM_API_MESSAGE.membersFetchError,
    );

    return parseTeamMembers(rawData);
};

export const addTeamMember = async ({
    teamId,
    nickname,
}: AddTeamMemberParams): Promise<TeamMember[]> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/members/`),
        {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ nickname }),
        },
        TEAM_API_MESSAGE.memberAddError,
    );

    return parseTeamMembers(rawData);
};

export const removeTeamMember = async ({
    teamId,
    memberId,
}: RemoveTeamMemberParams): Promise<TeamMember[] | undefined> => {
    const response = await authFetch(
        buildTeamUrl(`${teamId}/members/${memberId}/`),
        {
            method: 'DELETE',
            headers: buildHeaders(),
        },
    );

    if (!response.ok) {
        throw new Error(
            `${TEAM_API_MESSAGE.memberRemoveError} (status: ${response.status})`,
        );
    }

    if (response.status === 204) {
        return undefined;
    }

    const responseText = await response.text();

    if (!responseText) {
        return undefined;
    }

    const rawData: unknown = JSON.parse(responseText);

    return parseTeamMembers(rawData);
};

export const delegateTeamLeader = async ({
    teamId,
    userId,
}: DelegateTeamLeaderParams): Promise<TeamSummary> => {
    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/leader/`),
        {
            method: 'PATCH',
            headers: buildHeaders(),
            body: JSON.stringify({ user_id: userId }),
        },
        TEAM_API_MESSAGE.leaderDelegateError,
    );

    return parseTeamConfig(rawData);
};

export const updateTeamConfig = async ({
    teamId,
    name,
    colorId,
}: UpdateTeamConfigParams): Promise<TeamSummary> => {
    const body = {
        ...(name !== undefined ? { name } : {}),
        ...(colorId !== undefined ? { color_id: colorId } : {}),
    };

    const rawData = await requestJson<unknown>(
        buildTeamUrl(`${teamId}/config/`),
        {
            method: 'PATCH',
            headers: buildHeaders(),
            body: JSON.stringify(body),
        },
        TEAM_API_MESSAGE.configUpdateError,
    );

    return parseTeamConfig(rawData);
};
