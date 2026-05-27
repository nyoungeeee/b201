import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAuthSession } from '../../hooks/useAuthSession';
import { buildKakaoAuthorizeUrl } from '../../utils/kakaoAuth';

const RequireAuth = () => {
    const location = useLocation();
    const { isLoggedIn } = useAuthSession();
    const didStartLoginRef = useRef(false);

    useEffect(() => {
        if (isLoggedIn || didStartLoginRef.current) return;

        didStartLoginRef.current = true;
        const returnTo = `${location.pathname}${location.search}${location.hash}`;

        window.location.assign(buildKakaoAuthorizeUrl(returnTo));
    }, [isLoggedIn, location.hash, location.pathname, location.search]);

    return isLoggedIn ? <Outlet /> : null;
};

export default RequireAuth;
