const DEFAULT_ACCESS_TOKEN_KEY = 'b201_access_token';
const DEFAULT_REFRESH_TOKEN_KEY = 'b201_refresh_token';
const DEFAULT_AUTH_USER_KEY = 'b201_auth_user';
const viteEnv = import.meta.env ?? {};

const looksLikeJwt = (value: string) => value.split('.').length === 3;

const getStorageKey = (
    envValue: string | undefined,
    fallback: string,
) => {
    if (!envValue) return fallback;
    if (looksLikeJwt(envValue)) return fallback;

    return envValue;
};

export const API_BASE_URL =
    viteEnv.VITE_API_BASE_URL ?? 'https://api.b201.kr/v1';

const DEFAULT_ADMIN_BASE_URL = viteEnv.DEV
    ? 'http://localhost:5174'
    : 'https://admin.b201.kr';

export const ADMIN_BASE_URL =
    viteEnv.VITE_ADMIN_BASE_URL ?? DEFAULT_ADMIN_BASE_URL;
export const KAKAO_REST_API_KEY =
    viteEnv.VITE_KAKAO_REST_API_KEY ?? '';
export const KAKAO_REDIRECT_URI =
    viteEnv.VITE_KAKAO_REDIRECT_URI ?? '';

export const ACCESS_TOKEN_KEY = getStorageKey(
    viteEnv.VITE_ACCESS_TOKEN_KEY,
    DEFAULT_ACCESS_TOKEN_KEY,
);
export const REFRESH_TOKEN_KEY = getStorageKey(
    viteEnv.VITE_REFRESH_TOKEN_KEY,
    DEFAULT_REFRESH_TOKEN_KEY,
);
export const AUTH_USER_KEY = getStorageKey(
    viteEnv.VITE_AUTH_USER_KEY,
    DEFAULT_AUTH_USER_KEY,
);
export const KAKAO_AUTH_STATE_KEY = 'b201_kakao_auth_state';
export const KAKAO_AUTH_RETURN_TO_KEY = 'b201_kakao_auth_return_to';
