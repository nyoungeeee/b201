import { InfoCircleIcon } from '../common/icons';

interface ChangeLeaderModalProps {
    id: number;
    nickname: string;
    onCancel: () => void;
    onConfirm: () => void;
}

const CHANGE_LEADER_MODAL_TEXT = {
    title: '리더 위임',
    cancelButton: '취소',
    confirmButton: '위임하기',
} as const;

const getDescription = (nickname: string) => (
    <>
        {nickname}를 리더로 변경해요.
        <br />
        <br />
        기존 리더는 일반 멤버로 전환되며
        <br />
        더 이상 팀을 관리할 수 없어요.
    </>
);

const ChangeLeaderModal = ({
    nickname,
    onCancel,
    onConfirm,
}: ChangeLeaderModalProps) => {
    return (
        <div className="team-modal">
            <div
                className="team-modal__backdrop"
                onClick={onCancel}
            />

            <section className="team-modal__panel">
                <InfoCircleIcon
                    size={54}
                    color="var(--text-error)"
                />

                <h2 className="team-modal__title">
                    {CHANGE_LEADER_MODAL_TEXT.title}
                </h2>

                <p className="team-modal__description">
                    {getDescription(nickname)}
                </p>

                <div className="team-modal__actions">
                    <button
                        type="button"
                        className="team-modal__button team-modal__button--cancel"
                        onClick={onCancel}
                    >
                        {CHANGE_LEADER_MODAL_TEXT.cancelButton}
                    </button>

                    <button
                        type="button"
                        className="team-modal__button team-modal__button--confirm"
                        onClick={onConfirm}
                    >
                        {CHANGE_LEADER_MODAL_TEXT.confirmButton}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ChangeLeaderModal;