import { useEffect, useState } from 'react';

import { getMyInfo } from '../apis/accountApi';
import type { AuthUser } from '../apis/authApi';
import {
    AUTH_SESSION_EVENT,
    clearAuthSession,
    getAuthUser,
    saveAuthUser,
} from '../utils/authStorage';

const COOKIE_SESSION_SENTINEL = 'cookie-session';

type AuthSession = {
    accessToken: string | null;
    user: AuthUser | null;
    isLoggedIn: boolean;
    isLoading: boolean;
};

const readAuthSession = (): AuthSession => {
    const user = getAuthUser();

    return {
        accessToken: user ? COOKIE_SESSION_SENTINEL : null,
        user,
        isLoggedIn: !!user,
        isLoading: false,
    };
};

export const useAuthSession = () => {
    const [session, setSession] = useState<AuthSession>(() => ({
        ...readAuthSession(),
        isLoading: true,
    }));

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

    useEffect(() => {
        let isMounted = true;

        const syncUserFromCookie = async () => {
            try {
                const user = await getMyInfo();
                if (!isMounted) return;

                saveAuthUser(user);
                setSession({
                    accessToken: COOKIE_SESSION_SENTINEL,
                    user,
                    isLoggedIn: true,
                    isLoading: false,
                });
            } catch {
                if (!isMounted) return;

                clearAuthSession();
                setSession({
                    accessToken: null,
                    user: null,
                    isLoggedIn: false,
                    isLoading: false,
                });
            }
        };

        void syncUserFromCookie();

        return () => {
            isMounted = false;
        };
    }, []);

    return session;
};
