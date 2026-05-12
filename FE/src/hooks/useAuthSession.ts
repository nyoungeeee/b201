import { useEffect, useState } from 'react';

import type { AuthUser } from '../apis/authApi';
import {
    AUTH_SESSION_EVENT,
    getAccessToken,
    getAuthUser,
} from '../utils/authStorage';

type AuthSession = {
    accessToken: string | null;
    user: AuthUser | null;
    isLoggedIn: boolean;
};

const readAuthSession = (): AuthSession => {
    const accessToken = getAccessToken();
    const user = getAuthUser();

    return {
        accessToken,
        user,
        isLoggedIn: !!accessToken,
    };
};

export const useAuthSession = () => {
    const [session, setSession] =
        useState<AuthSession>(readAuthSession);

    useEffect(() => {
        const syncSession = () => {
            setSession(readAuthSession());
        };

        window.addEventListener(AUTH_SESSION_EVENT, syncSession);
        window.addEventListener('storage', syncSession);

        return () => {
            window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
            window.removeEventListener('storage', syncSession);
        };
    }, []);

    return session;
};
