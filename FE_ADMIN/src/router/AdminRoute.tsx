import { useEffect, useState } from 'react';

import { checkAdminAccess } from '../apis/adminApi';
import { USER_BASE_URL } from '../constants/env';
import { useAuthSession } from '../hooks/useAuthSession';
import AdminLoginPage from '../pages/AdminLoginPage';
import AdminPage from '../pages/AdminPage';
import { clearAuthSession } from '../utils/authStorage';
import { resolveAdminAccessState } from '../utils/adminAccess';

const AdminRoute = () => {
    const { accessToken, isLoading } = useAuthSession();
    const [adminAccess, setAdminAccess] = useState<{
        accessToken: string;
        isAllowed: boolean;
    } | null>(null);

    useEffect(() => {
        let isMounted = true;

        if (isLoading || !accessToken) {
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
    }, [accessToken, isLoading]);

    const isAllowed =
        adminAccess?.accessToken === accessToken
            ? adminAccess.isAllowed
            : null;
    const accessState = resolveAdminAccessState(accessToken, isAllowed);

    useEffect(() => {
        if (accessState !== 'forbidden') return;

        clearAuthSession();
        window.location.replace(USER_BASE_URL);
    }, [accessState]);

    if (!isLoading && accessState === 'signed-out') return <AdminLoginPage />;
    if (accessState === 'allowed') return <AdminPage />;

    return (
        <div className="app-shell">
            <div className="mobile-frame admin-frame">
                <main className="admin-login">
                    <section className="admin-loading-state">
                        <div
                            className="admin-loading-state__spinner"
                            aria-hidden="true"
                        />
                        <p>관리자 권한 확인 중...</p>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default AdminRoute;
