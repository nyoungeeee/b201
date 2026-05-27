import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { checkAdminAccess } from '../apis/adminApi';
import { useAuthSession } from '../hooks/useAuthSession';

type AdminRouteProps = {
    children: ReactNode;
};

const AdminRoute = ({ children }: AdminRouteProps) => {
    const { accessToken } = useAuthSession();
    const [adminAccess, setAdminAccess] = useState<{
        accessToken: string;
        isAllowed: boolean;
    } | null>(null);

    useEffect(() => {
        let isMounted = true;

        if (!accessToken) {
            return undefined;
        }

        checkAdminAccess()
            .then((hasAccess) => {
                if (isMounted) {
                    setAdminAccess({
                        accessToken,
                        isAllowed: hasAccess,
                    });
                }
            })
            .catch(() => {
                if (isMounted) {
                    setAdminAccess({
                        accessToken,
                        isAllowed: false,
                    });
                }
            });

        return () => {
            isMounted = false;
        };
    }, [accessToken]);

    if (!accessToken) {
        return <Navigate to="/" replace />;
    }

    if (adminAccess?.accessToken !== accessToken) {
        return null;
    }

    if (!adminAccess.isAllowed) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;
