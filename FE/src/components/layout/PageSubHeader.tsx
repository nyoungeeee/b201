import { useNavigate } from 'react-router-dom';
import ChevronLeftIcon from '../common/icons/ChevronLeftIcon';

interface PageSubHeaderProps {
    title?: string;
    onBack?: () => void;
    showBackButton?: boolean;
}

const PageSubHeader = ({
    title,
    onBack,
    showBackButton = true,
}: PageSubHeaderProps) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }

        navigate(-1);
    };

    return (
        <header className="page-sub-header">
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

            {title && <h1 className="page-sub-header__title">{title}</h1>}
        </header>
    );
};

export default PageSubHeader;