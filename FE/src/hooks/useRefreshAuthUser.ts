import { useEffect } from 'react';

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
};
