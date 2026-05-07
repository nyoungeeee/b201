import { ErrorCircleIcon } from '../common/icons';

interface RemoveMemberModalProps {
    nickname: string;
    onCancel: () => void;
    onConfirm: () => void;
}

const RemoveMemberModal = ({
    nickname,
    onCancel,
    onConfirm,
}: RemoveMemberModalProps) => {
    return (
        <div className="team-modal">
            <div
                className="team-modal__backdrop"
                onClick={onCancel}
            />

            <section className="team-modal__panel">
                <ErrorCircleIcon size={54} />

                <h2 className="team-modal__title">
                    팀 멤버 제거
                </h2>

                <p className="team-modal__description">
                    {nickname}를 팀에서 제거하시겠습니까?
                    <br />
                    <br />
                    제거하면 해당 멤버는 더 이상
                    <br />
                    팀 예약 신청을 할 수 없습니다.
                </p>

                <div className="team-modal__actions">
                    <button
                        type="button"
                        className="team-modal__button team-modal__button--cancel"
                        onClick={onCancel}
                    >
                        취소
                    </button>

                    <button
                        type="button"
                        className="team-modal__button team-modal__button--danger"
                        onClick={onConfirm}
                    >
                        제거
                    </button>
                </div>
            </section>
        </div>
    );
};

export default RemoveMemberModal;