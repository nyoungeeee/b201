import {
    KAKAO_AUTH_RETURN_TO_KEY,
    KAKAO_AUTH_STATE_KEY,
    KAKAO_REDIRECT_URI,
    KAKAO_REST_API_KEY,
} from '../constants/env';

const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const DEFAULT_RETURN_TO = '/';

const createState = () => {
    if (crypto.randomUUID) return crypto.randomUUID();

    const randomValues = new Uint32Array(4);
    crypto.getRandomValues(randomValues);

    return Array.from(randomValues, (value) => value.toString(16)).join('');
};

const isSafeReturnTo = (returnTo: string) =>
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//') &&
    !returnTo.startsWith('/auth/kakao/callback');

export const buildKakaoAuthorizeUrl = (returnTo = DEFAULT_RETURN_TO) => {
    if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
        throw new Error('카카오 로그인 환경변수가 설정되지 않았습니다.');
    }

    const state = createState();
    sessionStorage.setItem(KAKAO_AUTH_STATE_KEY, state);
    sessionStorage.setItem(
        KAKAO_AUTH_RETURN_TO_KEY,
        isSafeReturnTo(returnTo) ? returnTo : DEFAULT_RETURN_TO,
    );

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: KAKAO_REDIRECT_URI,
        state,
    });

    return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
};

export const verifyKakaoAuthState = (state: string | null) => {
    const savedState = sessionStorage.getItem(KAKAO_AUTH_STATE_KEY);
    sessionStorage.removeItem(KAKAO_AUTH_STATE_KEY);

    return !!state && !!savedState && state === savedState;
};

export const takeKakaoAuthReturnTo = () => {
    const returnTo = sessionStorage.getItem(KAKAO_AUTH_RETURN_TO_KEY);
    sessionStorage.removeItem(KAKAO_AUTH_RETURN_TO_KEY);

    return returnTo && isSafeReturnTo(returnTo)
        ? returnTo
        : DEFAULT_RETURN_TO;
};
