import { InfoCircleIcon } from '../common/icons';
import { CHANGE_LEADER_MODAL_TEXT } from '../../domains/team/constants';
import TeamActionModal from './TeamActionModal';

interface ChangeLeaderModalProps {
    id: number;
    nickname: string;
    isConfirmDisabled?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

const ChangeLeaderModal = ({
    nickname,
    isConfirmDisabled = false,
    onCancel,
    onConfirm,
}: ChangeLeaderModalProps) => {
    return (
        <TeamActionModal
            icon={
                <InfoCircleIcon
                    size={54}
                    color="var(--text-error)"
                />
            }
            title={CHANGE_LEADER_MODAL_TEXT.title}
            description={CHANGE_LEADER_MODAL_TEXT.description(nickname)}
            cancelLabel={CHANGE_LEADER_MODAL_TEXT.cancelButton}
            confirmLabel={CHANGE_LEADER_MODAL_TEXT.confirmButton}
            confirmVariant="confirm"
            isConfirmDisabled={isConfirmDisabled}
            onCancel={onCancel}
            onConfirm={onConfirm}
        />
    );
};

export default ChangeLeaderModal;
