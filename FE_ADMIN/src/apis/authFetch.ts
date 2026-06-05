import {
    ACCESS_TOKEN_KEY,
    API_BASE_URL,
    AUTH_USER_KEY,
    REFRESH_TOKEN_KEY,
} from '../constants/env.ts';

const API_ORIGIN_URL = API_BASE_URL.replace(/\/v1\/?$/, '');
const AUTH_SESSION_EVENT = 'b201_auth_session_change';

const withCredentials = (init: RequestInit = {}): RequestInit => ({
    ...init,
    credentials: 'include',
});

const clearClientAuthState = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
    }
};

export const authFetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
): Promise<Response> => {
    const response = await fetch(input, withCredentials(init));

    if (response.status !== 401) {
        return response;
    }

    const refreshResponse = await fetch(`${API_ORIGIN_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    });

    if (!refreshResponse.ok) {
        clearClientAuthState();
        return response;
    }

    return fetch(input, withCredentials(init));
};

export const logoutWithCookie = async (): Promise<void> => {
    await fetch(`${API_ORIGIN_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
};
