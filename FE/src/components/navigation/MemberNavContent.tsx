import { useNavigate } from 'react-router-dom';

import { ChevronRightIcon } from '../common/icons';
import logo from "../../assets/B201_logo.png";
import { clearAuthSession } from '../../utils/authStorage';
import {
    MEMBER_NAV_MENU_ITEMS,
    MEMBER_NAV_TEXT,
} from './constants';

type Props = {
    nickname?: string;
    hasAdminAccess?: boolean;
    onClose: () => void;
};

const MemberNavContent = ({
    nickname = MEMBER_NAV_TEXT.defaultNickname,
    hasAdminAccess = false,
    onClose,
}: Props) => {
    const navigate = useNavigate();

    const handleMove = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleLogout = () => {
        clearAuthSession();
        navigate('/', {
            state: {
                toastMessage: MEMBER_NAV_TEXT.logoutToast,
            },
        });
        onClose();
    };

    return (
        <>
            <div className="side-nav-modal__member-header">
                <div className="side-nav-modal__logo side-nav-modal__logo--member">
                    <img src={logo} alt="B201" />
                </div>

                <div className="side-nav-modal__user">
                    <p className="side-nav-modal__greeting">
                        {MEMBER_NAV_TEXT.greeting}
                    </p>
                    <p className="side-nav-modal__nickname">
                        {nickname}
                        <span className="side-nav-modal__nickname-suffix">
                            {MEMBER_NAV_TEXT.nicknameSuffix}
                        </span>
                    </p>
                </div>
            </div>

            <div className="side-nav-modal__divider" />

            <nav className="side-nav-modal__menu">
                {MEMBER_NAV_MENU_ITEMS.map(({ label, path }, index) => (
                    <button
                        key={path}
                        type="button"
                        className="side-nav-modal__menu-item"
                        onClick={() => handleMove(path)}
                    >
                        <span>{label}</span>
                        {index > 0 && (
                            <span className="side-nav-modal__arrow">
                                <ChevronRightIcon />
                            </span>
                        )}
                    </button>
                ))}

                {hasAdminAccess && (
                    <button
                        type="button"
                        className="side-nav-modal__menu-item"
                        onClick={() => handleMove('/admin')}
                    >
                        <span>{MEMBER_NAV_TEXT.adminButton}</span>
                        <span className="side-nav-modal__arrow">
                            <ChevronRightIcon />
                        </span>
                    </button>
                )}

                <button
                    type="button"
                    className="side-nav-modal__menu-item"
                    onClick={handleLogout}
                >
                    <span>{MEMBER_NAV_TEXT.logoutButton}</span>
                </button>
            </nav>
        </>
    );
};

export default MemberNavContent;
