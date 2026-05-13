import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import logo from '../../assets/B201_header_logo.png';
import { useAuthSession } from '../../hooks/useAuthSession';
import { HamburgerIcon } from '../common/icons';
import SideNavModal from '../navigation/SideNavModal';

const PageHeader = () => {
    const [isSideNavOpen, setIsSideNavOpen] = useState(false);
    const { isLoggedIn, user } = useAuthSession();

    useEffect(() => {
        if (!isSideNavOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isSideNavOpen]);

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

                <Link
                    to="/"
                    className="page-header__logo"
                    aria-label="예약 현황으로 이동"
                >
                    <img src={logo} alt="B201" />
                </Link>

                <div className="page-header__right" />
            </header>

            <SideNavModal
                isOpen={isSideNavOpen}
                onClose={() => setIsSideNavOpen(false)}
                isLoggedIn={isLoggedIn}
                nickname={user?.nickname ?? undefined}
            />
        </>
    );
};

export default PageHeader;
