import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthSession } from '../../hooks/useAuthSession';
import { buildKakaoLoginUrl } from '../../utils/kakaoAuth';

const RequireAuth = () => {
    const location = useLocation();
    const { isLoading, isLoggedIn } = useAuthSession();
    const didStartLoginRef = useRef(false);
    const [enteredWhileLoggedIn] = useState(isLoggedIn);

    useEffect(() => {
        if (isLoading || isLoggedIn || enteredWhileLoggedIn || didStartLoginRef.current) return;

        didStartLoginRef.current = true;
        const returnTo = `${location.pathname}${location.search}${location.hash}`;

        window.location.assign(buildKakaoLoginUrl(returnTo));
    }, [
        enteredWhileLoggedIn,
        isLoggedIn,
        isLoading,
        location.hash,
        location.pathname,
        location.search,
    ]);

    if (!isLoading && !isLoggedIn && enteredWhileLoggedIn) {
        return <Navigate to="/" replace />;
    }

    return isLoggedIn ? <Outlet /> : null;
};

export default RequireAuth;
