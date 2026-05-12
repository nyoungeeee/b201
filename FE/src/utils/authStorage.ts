import type { AuthUser, SigninResponse } from '../apis/authApi';
import {
    ACCESS_TOKEN_KEY,
    AUTH_USER_KEY,
    REFRESH_TOKEN_KEY,
} from '../constants/env';

export const AUTH_SESSION_EVENT = 'b201_auth_session_change';

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

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

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

export const clearAuthSession = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    notifyAuthSessionChange();
};
