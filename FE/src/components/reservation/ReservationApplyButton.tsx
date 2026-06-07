import { useNavigate } from 'react-router-dom';

import { RESERVATION_COMMON_TEXT } from '../../domains/reservation/constants';

interface ReservationApplyButtonProps {
    selectedDate?: string;
}

const ReservationApplyButton = ({ selectedDate }: ReservationApplyButtonProps) => {
    const navigate = useNavigate();
    const applyPath = selectedDate
        ? `/reservation/apply?date=${encodeURIComponent(selectedDate)}`
        : '/reservation/apply';

    return (
        <div className="floating-cta">
            <button
                type="button"
                className="reservation-apply-button"
                onClick={() => navigate(applyPath, { state: { selectedDate } })}
            >
                {RESERVATION_COMMON_TEXT.apply}
            </button>
        </div>
    );
};

export default ReservationApplyButton;
