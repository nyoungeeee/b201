import {
    ACCESS_TOKEN_KEY,
    API_BASE_URL,
    AUTH_USER_KEY,
    REFRESH_TOKEN_KEY,
} from '../constants/env.ts';

const API_ORIGIN_URL = API_BASE_URL.replace(/\/v1\/?$/, '');
const AUTH_SESSION_EVENT = 'b201_auth_session_change';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
let csrfTokenPromise: Promise<string> | null = null;
let refreshPromise: Promise<boolean> | null = null;

const getCsrfToken = (): Promise<string> => {
    if (csrfTokenPromise === null) {
        csrfTokenPromise = fetch(`${API_ORIGIN_URL}/auth/csrf`, {
            credentials: 'include',
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('CSRF token request failed');
                }

                const data = (await response.json()) as { csrfToken: string };
                return data.csrfToken;
            })
            .catch((error: unknown) => {
                csrfTokenPromise = null;
                throw error;
            });
    }

    return csrfTokenPromise;
};

const withCredentialsAndCsrf = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
): Promise<RequestInit> => {
    const requestInit = {
        ...init,
        credentials: 'include' as const,
    };
    const method = (
        init.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    if (SAFE_METHODS.has(method)) {
        return requestInit;
    }

    const headers = new Headers(init.headers);
    headers.set('X-CSRFToken', await getCsrfToken());
    return { ...requestInit, headers };
};

const clearClientAuthState = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
    }
};

export const refreshWithCookie = (): Promise<boolean> => {
    if (refreshPromise === null) {
        const refreshUrl = `${API_ORIGIN_URL}/auth/refresh`;
        refreshPromise = withCredentialsAndCsrf(refreshUrl, {
            method: 'POST',
        })
            .then((init) => fetch(refreshUrl, init))
            .then((response) => response.ok)
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

export const authFetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
): Promise<Response> => {
    const response = await fetch(
        input,
        await withCredentialsAndCsrf(input, init),
    );

    if (response.status !== 401) {
        return response;
    }

    if (!(await refreshWithCookie())) {
        clearClientAuthState();
        return response;
    }

    return fetch(input, await withCredentialsAndCsrf(input, init));
};

export const logoutWithCookie = async (): Promise<void> => {
    const logoutUrl = `${API_ORIGIN_URL}/auth/logout`;
    await fetch(logoutUrl, await withCredentialsAndCsrf(logoutUrl, {
        method: 'POST',
    }));
};
