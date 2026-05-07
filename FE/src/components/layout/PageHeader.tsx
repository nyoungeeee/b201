import { useEffect, useState } from "react";
import logo from "../../assets/B201_header_logo.png";
import { HamburgerIcon } from "../common/icons";
import SideNavModal from "../navigation/SideNavModal";

type Props = {
    isLoggedIn: boolean;
};

const PageHeader = ({ isLoggedIn }: Props) => {
    const [isSideNavOpen, setIsSideNavOpen] = useState(false);

    useEffect(() => {
        if (!isSideNavOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

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

                <div className="page-header__logo">
                    <img src={logo} alt="B201" />
                </div>

                <div className="page-header__right" />
            </header>

            <SideNavModal
                isOpen={isSideNavOpen}
                onClose={() => setIsSideNavOpen(false)}
                isLoggedIn={isLoggedIn}
                nickname="닉네임은여덟글자"
            />
        </>
    );
};

export default PageHeader;