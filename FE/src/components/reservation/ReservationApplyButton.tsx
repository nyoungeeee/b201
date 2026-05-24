import { useNavigate } from 'react-router-dom';

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
                예약 신청하기
            </button>
        </div>
    );
};

export default ReservationApplyButton;
