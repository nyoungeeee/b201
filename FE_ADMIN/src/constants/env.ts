const DEFAULT_ACCESS_TOKEN_KEY = 'b201_access_token';
const DEFAULT_REFRESH_TOKEN_KEY = 'b201_refresh_token';
const DEFAULT_AUTH_USER_KEY = 'b201_auth_user';

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
    import.meta.env.VITE_API_BASE_URL ?? 'https://api.b201.kr/v1';
export const USER_BASE_URL =
    import.meta.env.VITE_USER_BASE_URL ?? 'https://b201.kr';
export const KAKAO_REST_API_KEY =
    import.meta.env.VITE_KAKAO_REST_API_KEY ?? '';
export const KAKAO_REDIRECT_URI =
    import.meta.env.VITE_KAKAO_REDIRECT_URI ?? '';

export const ACCESS_TOKEN_KEY = getStorageKey(
    import.meta.env.VITE_ACCESS_TOKEN_KEY,
    DEFAULT_ACCESS_TOKEN_KEY,
);
export const REFRESH_TOKEN_KEY = getStorageKey(
    import.meta.env.VITE_REFRESH_TOKEN_KEY,
    DEFAULT_REFRESH_TOKEN_KEY,
);
export const AUTH_USER_KEY = getStorageKey(
    import.meta.env.VITE_AUTH_USER_KEY,
    DEFAULT_AUTH_USER_KEY,
);
export const KAKAO_AUTH_STATE_KEY = 'b201_kakao_auth_state';
export const KAKAO_AUTH_RETURN_TO_KEY = 'b201_kakao_auth_return_to';
