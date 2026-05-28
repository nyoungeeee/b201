import { useEffect, useState } from "react";

import GuestNavContent from "./GuestNavContent";
import MemberNavContent from "./MemberNavContent";
import { SIDE_NAV_TEXT } from "./constants";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    isLoggedIn: boolean;
    nickname?: string;
    hasAdminAccess?: boolean;
};

const ANIMATION_DURATION = 240;

const SideNavModal = ({
    isOpen,
    onClose,
    isLoggedIn,
    nickname,
    hasAdminAccess = false,
}: Props) => {
    const [isVisible, setIsVisible] = useState(isOpen);

    useEffect(() => {
        let timer: number;

        if (isOpen) {
            timer = window.setTimeout(() => {
                setIsVisible(true);
            }, 0);
        } else {
            timer = window.setTimeout(() => {
                setIsVisible(false);
            }, ANIMATION_DURATION);
        }

        return () => window.clearTimeout(timer);
    }, [isOpen]);

    if (!isVisible) return null;

    const stateClass = isOpen ? "is-open" : "is-closing";

    return (
        <div className={`side-nav-modal ${stateClass}`} onClick={onClose}>
            <aside
                className={`side-nav-modal__panel ${stateClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="side-nav-modal__close"
                    onClick={onClose}
                    aria-label={SIDE_NAV_TEXT.closeAriaLabel}
                >
                    {SIDE_NAV_TEXT.closeButton}
                </button>

                {isLoggedIn ? (
                    <MemberNavContent
                        nickname={nickname}
                        hasAdminAccess={hasAdminAccess}
                        onClose={onClose}
                    />
                ) : (
                    <GuestNavContent onClose={onClose} />
                )}

                <div className="side-nav-modal__divider-bottom" />
            </aside>
        </div>
    );
};

export default SideNavModal;
