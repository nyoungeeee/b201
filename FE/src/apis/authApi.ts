import { API_BASE_URL } from '../constants/env';
import { logoutWithCookie } from './authFetch';

const API_ORIGIN_URL = API_BASE_URL.replace(/\/v1\/?$/, '');

export type AuthTeam = {
    id: number;
    name: string;
    color: string;
};

export type AuthUser = {
    id: number;
    email: string | null;
    nickname: string | null;
    team: AuthTeam[];
};

export const refreshAuthSession = async (): Promise<boolean> => {
    const response = await fetch(`${API_ORIGIN_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    });

    return response.ok;
};

export const logout = logoutWithCookie;
