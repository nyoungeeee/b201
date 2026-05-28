import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthSession } from '../../hooks/useAuthSession';
import { buildKakaoAuthorizeUrl } from '../../utils/kakaoAuth';

const RequireAuth = () => {
    const location = useLocation();
    const { isLoggedIn } = useAuthSession();
    const didStartLoginRef = useRef(false);
    const [enteredWhileLoggedIn] = useState(isLoggedIn);

    useEffect(() => {
        if (isLoggedIn || enteredWhileLoggedIn || didStartLoginRef.current) return;

        didStartLoginRef.current = true;
        const returnTo = `${location.pathname}${location.search}${location.hash}`;

        window.location.assign(buildKakaoAuthorizeUrl(returnTo));
    }, [
        enteredWhileLoggedIn,
        isLoggedIn,
        location.hash,
        location.pathname,
        location.search,
    ]);

    if (!isLoggedIn && enteredWhileLoggedIn) {
        return <Navigate to="/" replace />;
    }

    return isLoggedIn ? <Outlet /> : null;
};

export default RequireAuth;
