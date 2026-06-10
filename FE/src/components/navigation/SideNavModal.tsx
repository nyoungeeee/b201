import { useEffect, useState } from "react";

import kakaoPayQr from "../../assets/kakao_pay_qr.png";
import { COFFEE_DONATION_URL } from "../../constants/env";
import { isMobileLikeDevice } from "../../utils/deviceUtils";
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
    const [isCoffeeQrOpen, setIsCoffeeQrOpen] = useState(false);

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

    useEffect(() => {
        if (!isCoffeeQrOpen) return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isCoffeeQrOpen]);

    if (!isVisible && !isCoffeeQrOpen) return null;

    const stateClass = isOpen ? "is-open" : "is-closing";
    const handleCoffeeClick = () => {
        if (isMobileLikeDevice()) {
            window.location.assign(COFFEE_DONATION_URL);
            return;
        }

        setIsCoffeeQrOpen(true);
        onClose();
    };

    return (
        <>
            {isVisible && (
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

                        {COFFEE_DONATION_URL && (
                            <button
                                type="button"
                                className="side-nav-modal__coffee-link"
                                onClick={handleCoffeeClick}
                            >
                                {SIDE_NAV_TEXT.coffeeLink}
                            </button>
                        )}

                        <div className="side-nav-modal__divider-bottom" />
                    </aside>
                </div>
            )}

            {isCoffeeQrOpen && (
                <div
                    className="side-nav-modal__qr-backdrop"
                    role="presentation"
                    onClick={() => setIsCoffeeQrOpen(false)}
                >
                    <section
                        className="side-nav-modal__qr-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="coffee-qr-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="side-nav-modal__qr-close"
                            aria-label={SIDE_NAV_TEXT.coffeeQrCloseAriaLabel}
                            onClick={() => setIsCoffeeQrOpen(false)}
                        >
                            {SIDE_NAV_TEXT.closeButton}
                        </button>
                        <h2 id="coffee-qr-title">
                            {SIDE_NAV_TEXT.coffeeQrTitle}
                        </h2>
                        <img
                            src={kakaoPayQr}
                            alt={SIDE_NAV_TEXT.coffeeQrTitle}
                        />
                        <p>{SIDE_NAV_TEXT.coffeeQrDescription}</p>
                    </section>
                </div>
            )}
        </>
    );
};

export default SideNavModal;
