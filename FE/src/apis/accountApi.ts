import { API_BASE_URL } from '../constants/env';
import type { AuthUser } from './authApi';

type CheckNicknameResponse = {
    available: boolean;
};

const ACCOUNT_API_MESSAGE = {
    nicknameCheckError: '닉네임 중복 확인에 실패했습니다.',
    nicknameUpdateError: '닉네임 변경에 실패했습니다.',
    userInfoResponseError: '사용자 정보 응답 형식이 올바르지 않습니다.',
    nicknameCheckResponseError:
        '닉네임 중복 확인 응답 형식이 올바르지 않습니다.',
} as const;

const buildMeUrl = (path = '') => `${API_BASE_URL}/me/${path}`;

const buildAuthHeaders = (accessToken: string): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
});

const isAuthUser = (value: unknown): value is AuthUser => {
    if (!value || typeof value !== 'object') return false;

    const data = value as Partial<AuthUser>;

    return (
        typeof data.id === 'number' &&
        (typeof data.email === 'string' || data.email === null) &&
        (typeof data.nickname === 'string' || data.nickname === null) &&
        Array.isArray(data.team)
    );
};

const isCheckNicknameResponse = (
    value: unknown,
): value is CheckNicknameResponse => {
    if (!value || typeof value !== 'object') return false;

    const data = value as Partial<CheckNicknameResponse>;

    return typeof data.available === 'boolean';
};

export const checkNicknameAvailability = async ({
    nickname,
    accessToken,
}: {
    nickname: string;
    accessToken: string;
}): Promise<boolean> => {
    const searchParams = new URLSearchParams({ nickname });

    const response = await fetch(
        `${buildMeUrl('nickname/check/')}?${searchParams.toString()}`,
        {
            method: 'GET',
            headers: buildAuthHeaders(accessToken),
        },
    );

    if (!response.ok) {
        throw new Error(
            `${ACCOUNT_API_MESSAGE.nicknameCheckError} (status: ${response.status})`,
        );
    }

    const data: unknown = await response.json();

    if (!isCheckNicknameResponse(data)) {
        throw new Error(ACCOUNT_API_MESSAGE.nicknameCheckResponseError);
    }

    return data.available;
};

export const updateMyNickname = async ({
    nickname,
    accessToken,
}: {
    nickname: string;
    accessToken: string;
}): Promise<AuthUser> => {
    const response = await fetch(buildMeUrl(), {
        method: 'PATCH',
        headers: buildAuthHeaders(accessToken),
        body: JSON.stringify({ nickname }),
    });

    if (!response.ok) {
        throw new Error(
            `${ACCOUNT_API_MESSAGE.nicknameUpdateError} (status: ${response.status})`,
        );
    }

    const data: unknown = await response.json();

    if (!isAuthUser(data)) {
        throw new Error(ACCOUNT_API_MESSAGE.userInfoResponseError);
    }

    return data;
};
