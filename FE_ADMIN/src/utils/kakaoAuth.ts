import {
    API_BASE_URL,
} from '../constants/env';

const DEFAULT_RETURN_TO = '/';
const API_ORIGIN_URL = API_BASE_URL.replace(/\/v1\/?$/, '');

const isSafeReturnTo = (returnTo: string) =>
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//') &&
    !returnTo.includes('://') &&
    !returnTo.toLowerCase().startsWith('javascript:') &&
    !returnTo.startsWith('/auth/kakao/callback');

export const buildKakaoLoginUrl = (returnTo = DEFAULT_RETURN_TO) => {
    const params = new URLSearchParams({
        client: 'admin',
        next: isSafeReturnTo(returnTo) ? returnTo : DEFAULT_RETURN_TO,
    });

    return `${API_ORIGIN_URL}/auth/kakao/login?${params.toString()}`;
};
