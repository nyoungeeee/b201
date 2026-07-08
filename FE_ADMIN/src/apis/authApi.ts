import { logoutWithCookie, refreshWithCookie } from './authFetch';

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

export const refreshAuthSession = async (): Promise<boolean> => refreshWithCookie();

export const logout = logoutWithCookie;
