import { useCallback, useEffect, useState } from 'react';

import { getMyInfo } from '../apis/accountApi';
import { saveAuthUser } from '../utils/authStorage';
import { useAuthSession } from './useAuthSession';

type UseRefreshAuthUserOptions = {
    enabled?: boolean;
};

export const useRefreshAuthUser = ({
    enabled = true,
}: UseRefreshAuthUserOptions = {}) => {
    const { isLoggedIn } = useAuthSession();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshAuthUser = useCallback(async () => {
        if (!isLoggedIn) return;

        setIsRefreshing(true);

        try {
            const user = await getMyInfo();
            saveAuthUser(user);
        } catch (error) {
            console.error('Auth user refresh failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (!enabled || !isLoggedIn) return;

        let isMounted = true;

        const refreshAuthUser = async () => {
            try {
                const user = await getMyInfo();

                if (isMounted) {
                    saveAuthUser(user);
                }
            } catch (error) {
                console.error('Auth user refresh failed:', error);
            }
        };

        void refreshAuthUser();

        return () => {
            isMounted = false;
        };
    }, [enabled, isLoggedIn]);

    return {
        isRefreshing,
        refreshAuthUser,
    };
};
