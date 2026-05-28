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
    const { accessToken } = useAuthSession();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshAuthUser = useCallback(async () => {
        if (!accessToken) return;

        setIsRefreshing(true);

        try {
            const user = await getMyInfo({ accessToken });
            saveAuthUser(user);
        } catch (error) {
            console.error('Auth user refresh failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (!enabled || !accessToken) return;

        let isMounted = true;

        const refreshAuthUser = async () => {
            try {
                const user = await getMyInfo({ accessToken });

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
    }, [accessToken, enabled]);

    return {
        isRefreshing,
        refreshAuthUser,
    };
};
