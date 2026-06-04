import { API_BASE_URL, KAKAO_REDIRECT_URI } from '../constants/env';
import { buildSigninRequestBody } from './authRequest';

export type AuthTeam = {
    id: number;
    name: string;
    color: string;
};

export type AuthUser = {
    id: number;
    email: string | null;
    nickname: string | null;
    team: AuthTeam[];
};

export type SigninResponse = AuthUser & {
    token: {
        access: string;
        refresh: string;
    };
};

const AUTH_API_MESSAGE = {
    signinError: '카카오 로그인에 실패했습니다.',
    signinResponseError: '로그인 응답 형식이 올바르지 않습니다.',
} as const;

const buildAuthUrl = (path: string) => `${API_BASE_URL}/auth/${path}`;

const isSigninResponse = (value: unknown): value is SigninResponse => {
    if (!value || typeof value !== 'object') return false;

    const data = value as Partial<SigninResponse>;

    return (
        typeof data.id === 'number' &&
        (typeof data.email === 'string' || data.email === null) &&
        (typeof data.nickname === 'string' || data.nickname === null) &&
        Array.isArray(data.team) &&
        !!data.token &&
        typeof data.token.access === 'string' &&
        typeof data.token.refresh === 'string'
    );
};

export const signinWithKakao = async (
    kakaoAuthCode: string,
): Promise<SigninResponse> => {
    const response = await fetch(buildAuthUrl('signin'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(
            buildSigninRequestBody(kakaoAuthCode, KAKAO_REDIRECT_URI),
        ),
    });

    if (!response.ok) {
        throw new Error(
            `${AUTH_API_MESSAGE.signinError} (status: ${response.status})`,
        );
    }

    const data: unknown = await response.json();

    if (!isSigninResponse(data)) {
        throw new Error(AUTH_API_MESSAGE.signinResponseError);
    }

    return data;
};
