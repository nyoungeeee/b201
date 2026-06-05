import { useNavigate } from 'react-router-dom';

import logo from "../../assets/B201_logo.png";
import { buildKakaoLoginUrl } from '../../utils/kakaoAuth';
import {
    GUEST_NAV_MENU_ITEMS,
    GUEST_NAV_TEXT,
} from './constants';

type Props = {
    onClose: () => void;
};

const GuestNavContent = ({ onClose }: Props) => {
    const navigate = useNavigate();

    const handleMove = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleKakaoLogin = () => {
        onClose();
        window.location.assign(buildKakaoLoginUrl());
    };

    return (
        <>
            <div className="side-nav-modal__logo side-nav-modal__logo--guest">
                <img src={logo} alt="B201" />
            </div>

            <button
                type="button"
                className="side-nav-modal__login"
                onClick={handleKakaoLogin}
            >
                <span className="side-nav-modal__kakao-icon" aria-hidden="true" />
                {GUEST_NAV_TEXT.kakaoLogin}
            </button>

            <div className="side-nav-modal__divider" />

            <nav className="side-nav-modal__menu">
                {GUEST_NAV_MENU_ITEMS.map(({ label, path }) => (
                    <button
                        key={path}
                        type="button"
                        className="side-nav-modal__menu-item"
                        onClick={() => handleMove(path)}
                    >
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
        </>
    );
};

export default GuestNavContent;
