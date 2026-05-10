import { useLocation, useNavigate } from 'react-router-dom';

import ChevronLeftIcon from '../common/icons/ChevronLeftIcon';

interface PageSubHeaderProps {
    title?: string;
    onBack?: () => void;
    showBackButton?: boolean;
    rightContent?: React.ReactNode;
}

const PageSubHeader = ({
    title,
    onBack,
    showBackButton = true,
    rightContent,
}: PageSubHeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }

        const paths = location.pathname
            .split('/')
            .filter(Boolean);

        if (paths.length <= 1) {
            navigate('/');
            return;
        }

        paths.pop();

        navigate(`/${paths.join('/')}`);
    };

    return (
        <header className="page-sub-header">
            <div className="page-sub-header__left">
                {showBackButton && (
                    <button
                        type="button"
                        className="page-sub-header__back-button"
                        onClick={handleBack}
                        aria-label="뒤로가기"
                    >
                        <ChevronLeftIcon />
                    </button>
                )}
            </div>

            {title && (
                <h1 className="page-sub-header__title">
                    {title}
                </h1>
            )}

            <div className="page-sub-header__right">
                {rightContent}
            </div>
        </header>
    );
};

export default PageSubHeader;