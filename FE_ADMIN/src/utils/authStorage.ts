import type { AuthUser } from '../apis/authApi';
import {
    ACCESS_TOKEN_KEY,
    AUTH_USER_KEY,
    KAKAO_AUTH_RETURN_TO_KEY,
    KAKAO_AUTH_STATE_KEY,
    REFRESH_TOKEN_KEY,
} from '../constants/env';

export const AUTH_SESSION_EVENT = 'b201_auth_session_change';

const notifyAuthSessionChange = () => {
    window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

export const getAuthUser = (): AuthUser | null => {
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

export const clearLegacyAuthTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(KAKAO_AUTH_STATE_KEY);
    sessionStorage.removeItem(KAKAO_AUTH_RETURN_TO_KEY);
};
