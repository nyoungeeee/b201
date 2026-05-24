import type { AuthUser, SigninResponse } from '../apis/authApi';
import {
    ACCESS_TOKEN_KEY,
    AUTH_USER_KEY,
    REFRESH_TOKEN_KEY,
} from '../constants/env';

export const AUTH_SESSION_EVENT = 'b201_auth_session_change';

// 개발 중일 때 로그인된 상태로 시작하기 위한 시드 데이터
const ENABLE_SEED_AUTH_SESSION = true;

const SEED_AUTH_SESSION: SigninResponse = {
    id: 1,
    email: 'seed-001@seed.b201.local',
    nickname: '푸른빈',
    team: [
        {
            name: '유다빈밴딧',
            id: 1,
            color: 'FF6A2A',
        },
    ],
    token: {
        access: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgyMjM5MjYyLCJpYXQiOjE3Nzk2NDcyNjIsImp0aSI6ImIxYWJlOTcyYzAwYzQ3ZDA4NWIxODE2NGE3M2Y4MzQ4IiwidXNlcl9pZCI6IjEifQ.kzR8EVt9KyXRfkWKI96LC9a2hAdOnjlG2oq0pQTy-X4',
        refresh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4MDI1MjA2MiwiaWF0IjoxNzc5NjQ3MjYyLCJqdGkiOiJjNDcwOTg2ZTU4MDk0ZjQ1OGM1ZjgwMjQzYmY3OTk0NyIsInVzZXJfaWQiOiIxIn0.kM-Plsv9N9Do5IWTl6cn8HBJWx5kMHgJt7JFPoPqMq8',
    },
};

const getSeedAuthUser = (): AuthUser => {
    const { token: _token, ...user } = SEED_AUTH_SESSION;

    return user;
};

const notifyAuthSessionChange = () => {
    window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

export const saveAuthSession = (signinResponse: SigninResponse) => {
    const { token, ...user } = signinResponse;

    localStorage.setItem(ACCESS_TOKEN_KEY, token.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, token.refresh);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    notifyAuthSessionChange();
};

export const getAccessToken = () => (
    ENABLE_SEED_AUTH_SESSION
        ? SEED_AUTH_SESSION.token.access
        : localStorage.getItem(ACCESS_TOKEN_KEY)
);

export const getAuthUser = (): AuthUser | null => {
    if (ENABLE_SEED_AUTH_SESSION) {
        return getSeedAuthUser();
    }

    const rawUser = localStorage.getItem(AUTH_USER_KEY);

    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser) as AuthUser;
    } catch {
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
    }
};

export const saveAuthUser = (user: AuthUser) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    notifyAuthSessionChange();
};

export const clearAuthSession = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    notifyAuthSessionChange();
};
