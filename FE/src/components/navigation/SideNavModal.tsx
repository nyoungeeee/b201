import { useEffect, useState } from "react";
import GuestNavContent from "./GuestNavContent";
import MemberNavContent from "./MemberNavContent";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    isLoggedIn: boolean;
    nickname?: string;
};

const ANIMATION_DURATION = 240;

const SideNavModal = ({ isOpen, onClose, isLoggedIn, nickname }: Props) => {
    const [isVisible, setIsVisible] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            return;
        }

        const timer = setTimeout(() => {
            setIsVisible(false);
        }, ANIMATION_DURATION);

        return () => clearTimeout(timer);
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
                    aria-label="메뉴 닫기"
                >
                    ×
                </button>

                {isLoggedIn ? (
                    <MemberNavContent
                        nickname={nickname}
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