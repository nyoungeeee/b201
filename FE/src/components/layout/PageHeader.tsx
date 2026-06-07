import {
    useEffect,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react';

import { checkAdminAccess } from '../../apis/adminAccessApi';
import logo from '../../assets/B201_header_logo.png';
import { roomDayQueryKeys } from '../../hooks/queries/useRoomDay';
import { roomMonthQueryKeys } from '../../hooks/queries/useRoomMonth';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useRefreshAuthUser } from '../../hooks/useRefreshAuthUser';
import { queryClient } from '../../lib/queryClient';
import { HamburgerIcon } from '../common/icons';
import SideNavModal from '../navigation/SideNavModal';

interface PageHeaderProps {
    rightContent?: ReactNode;
}

const PageHeader = ({ rightContent }: PageHeaderProps) => {
    const [isSideNavOpen, setIsSideNavOpen] = useState(false);
    const [hasAdminAccess, setHasAdminAccess] = useState(false);
    const { isLoggedIn, user } = useAuthSession();

    const shouldCheckAdminAccess = isLoggedIn && isSideNavOpen;
    const canShowAdminAccess = shouldCheckAdminAccess && hasAdminAccess;

    useRefreshAuthUser({ enabled: shouldCheckAdminAccess });

    const handleClickLogo = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();

        queryClient.removeQueries({
            queryKey: roomDayQueryKeys.all,
        });
        queryClient.removeQueries({
            queryKey: roomMonthQueryKeys.all,
        });

        if (window.location.pathname === '/' && window.location.search === '') {
            window.location.reload();
            return;
        }

        window.location.assign('/');
    };

    useEffect(() => {
        if (!isSideNavOpen) return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isSideNavOpen]);

    useEffect(() => {
        if (!shouldCheckAdminAccess) return undefined;

        let isMounted = true;

        checkAdminAccess()
            .then((isAllowed) => {
                if (isMounted) {
                    setHasAdminAccess(isAllowed);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setHasAdminAccess(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [shouldCheckAdminAccess]);

    return (
        <>
            <header className="page-header">
                <button
                    type="button"
                    className="page-header__menu"
                    onClick={() => setIsSideNavOpen(true)}
                    aria-label="메뉴 열기"
                >
                    <HamburgerIcon />
                </button>

                <a
                    href="/"
                    className="page-header__logo"
                    onClick={handleClickLogo}
                    aria-label="예약 현황으로 이동"
                >
                    <img src={logo} alt="B201" />
                </a>

                <div className="page-header__right">{rightContent}</div>
            </header>

            <SideNavModal
                isOpen={isSideNavOpen}
                onClose={() => setIsSideNavOpen(false)}
                isLoggedIn={isLoggedIn}
                nickname={user?.nickname ?? undefined}
                hasAdminAccess={canShowAdminAccess}
            />
        </>
    );
};

export default PageHeader;
