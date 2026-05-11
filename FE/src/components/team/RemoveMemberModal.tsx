import { ErrorCircleIcon } from '../common/icons';
import { REMOVE_MEMBER_MODAL_TEXT } from '../../domains/team/constants';
import TeamActionModal from './TeamActionModal';

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
        <TeamActionModal
            icon={<ErrorCircleIcon size={54} />}
            title={REMOVE_MEMBER_MODAL_TEXT.title}
            description={REMOVE_MEMBER_MODAL_TEXT.description(nickname)}
            cancelLabel={REMOVE_MEMBER_MODAL_TEXT.cancelButton}
            confirmLabel={REMOVE_MEMBER_MODAL_TEXT.confirmButton}
            confirmVariant="danger"
            onCancel={onCancel}
            onConfirm={onConfirm}
        />
    );
};

export default RemoveMemberModal;
