import { useEffect, useState } from "react";

import logo from "../../assets/B201_header_logo.png";
import {
    AUTH_SESSION_EVENT,
    getAccessToken,
    getAuthUser,
} from "../../utils/authStorage";
import { HamburgerIcon } from "../common/icons";
import SideNavModal from "../navigation/SideNavModal";

type AuthHeaderState = {
    isLoggedIn: boolean;
    nickname?: string;
};

const readAuthHeaderState = (): AuthHeaderState => {
    const accessToken = getAccessToken();
    const authUser = getAuthUser();

    return {
        isLoggedIn: !!accessToken,
        nickname: authUser?.nickname ?? undefined,
    };
};

const PageHeader = () => {
    const [isSideNavOpen, setIsSideNavOpen] = useState(false);
    const [authState, setAuthState] =
        useState<AuthHeaderState>(readAuthHeaderState);

    useEffect(() => {
        if (!isSideNavOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isSideNavOpen]);

    useEffect(() => {
        const syncAuthState = () => {
            setAuthState(readAuthHeaderState());
        };

        window.addEventListener(AUTH_SESSION_EVENT, syncAuthState);
        window.addEventListener("storage", syncAuthState);

        return () => {
            window.removeEventListener(AUTH_SESSION_EVENT, syncAuthState);
            window.removeEventListener("storage", syncAuthState);
        };
    }, []);

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

                <div className="page-header__logo">
                    <img src={logo} alt="B201" />
                </div>

                <div className="page-header__right" />
            </header>

            <SideNavModal
                isOpen={isSideNavOpen}
                onClose={() => setIsSideNavOpen(false)}
                isLoggedIn={authState.isLoggedIn}
                nickname={authState.nickname}
            />
        </>
    );
};

export default PageHeader;
