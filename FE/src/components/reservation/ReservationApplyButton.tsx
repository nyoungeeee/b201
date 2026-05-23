import { useNavigate } from 'react-router-dom';

const ReservationApplyButton = () => {
    const navigate = useNavigate();

    return (
        <div className="floating-cta">
            <button
                type="button"
                className="reservation-apply-button"
                onClick={() => navigate('/reservation/apply')}
            >
                예약 신청하기
            </button>
        </div>
    );
};

export default ReservationApplyButton;
