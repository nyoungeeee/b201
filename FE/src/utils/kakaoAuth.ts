import {
    KAKAO_AUTH_STATE_KEY,
    KAKAO_REDIRECT_URI,
    KAKAO_REST_API_KEY,
} from '../constants/env';

const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';

const createState = () => {
    if (crypto.randomUUID) return crypto.randomUUID();

    const randomValues = new Uint32Array(4);
    crypto.getRandomValues(randomValues);

    return Array.from(randomValues, (value) => value.toString(16)).join('');
};

export const buildKakaoAuthorizeUrl = () => {
    if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
        throw new Error('카카오 로그인 환경변수가 설정되지 않았습니다.');
    }

    const state = createState();
    sessionStorage.setItem(KAKAO_AUTH_STATE_KEY, state);

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
