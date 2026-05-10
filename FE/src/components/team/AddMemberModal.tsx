import type { ReactNode } from 'react';
import { useState } from 'react';

import {
    CheckCircleIcon,
    ErrorCircleIcon,
    InfoCircleIcon,
    PlusCircleIcon,
    XCircleIcon,
} from '../common/icons';
import { ADD_MEMBER_MODAL_TEXT } from '../../domains/team/constants';
import TeamActionModal from './TeamActionModal';

interface AddMemberModalProps {
    onCancel: () => void;
    onConfirm: (nickname: string) => void;
}

type AddMemberStatus =
    | 'empty'
    | 'typing'
    | 'checking'
    | 'invalid'
    | 'available';

interface StatusUi {
    inputClassName?: string;
    rightSlot?: ReactNode;
    messageIcon?: ReactNode;
    message?: string;
    messageClassName?: string;
}

const AddMemberModal = ({
    onCancel,
    onConfirm,
}: AddMemberModalProps) => {
    const [nickname, setNickname] = useState('');
    const [status, setStatus] =
        useState<AddMemberStatus>('empty');

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = e.target.value;

        setNickname(value);

        if (!value.trim()) {
            setStatus('empty');
            return;
        }

        setStatus('available');

        // TODO:
        // debounce 후 닉네임 확인 API 호출
        // setStatus('checking')
        // 성공 -> setStatus('available')
        // 실패 -> setStatus('invalid')
    };

    const handleClear = () => {
        setNickname('');
        setStatus('empty');
    };

    const handleConfirm = () => {
        if (status !== 'available') return;

        onConfirm(nickname);
    };

    const statusUi: Record<AddMemberStatus, StatusUi> = {
        empty: {},

        typing: {
            rightSlot: (
                <button
                    type="button"
                    className="form-input__action team-modal__input-action"
                    onClick={handleClear}
                    aria-label={
                        ADD_MEMBER_MODAL_TEXT.clearAriaLabel
                    }
                >
                    <XCircleIcon size={18} />
                </button>
            ),
        },

        checking: {
            rightSlot: <div className="team-modal__spinner" />,
            messageIcon: (
                <InfoCircleIcon
                    size={14}
                    color="var(--text-muted)"
                />
            ),
            message: ADD_MEMBER_MODAL_TEXT.checkingMessage,
        },

        invalid: {
            inputClassName: 'is-invalid',
            rightSlot: (
                <button
                    type="button"
                    className="form-input__action team-modal__input-action"
                    onClick={handleClear}
                    aria-label={
                        ADD_MEMBER_MODAL_TEXT.clearAriaLabel
                    }
                >
                    <ErrorCircleIcon size={18} />
                </button>
            ),
            messageIcon: <ErrorCircleIcon size={14} />,
            message: ADD_MEMBER_MODAL_TEXT.invalidMessage,
            messageClassName: 'is-error',
        },

        available: {
            inputClassName: 'is-available',
            rightSlot: <CheckCircleIcon size={18} />,
            messageIcon: <CheckCircleIcon size={14} />,
            message: ADD_MEMBER_MODAL_TEXT.availableMessage,
            messageClassName: 'is-success',
        },
    };

    const currentStatusUi = statusUi[status];
    const isConfirmDisabled = status !== 'available';

    return (
        <TeamActionModal
            icon={<PlusCircleIcon size={54} />}
            title={ADD_MEMBER_MODAL_TEXT.title}
            description={ADD_MEMBER_MODAL_TEXT.description}
            cancelLabel={ADD_MEMBER_MODAL_TEXT.cancelButton}
            confirmLabel={ADD_MEMBER_MODAL_TEXT.confirmButton}
            confirmVariant="primary"
            isConfirmDisabled={isConfirmDisabled}
            onCancel={onCancel}
            onConfirm={handleConfirm}
        >
            <div
                className={`
                    form-input
                    team-modal__input
                    ${currentStatusUi.inputClassName ?? ''}
                `}
            >
                <input
                    className="form-input__control"
                    type="text"
                    value={nickname}
                    onChange={handleChange}
                    placeholder={ADD_MEMBER_MODAL_TEXT.placeholder}
                />

                {currentStatusUi.rightSlot}
            </div>

            {currentStatusUi.message && (
                <div
                    className={`
                        form-message
                        team-modal__message
                        ${currentStatusUi.messageClassName ?? ''}
                    `}
                >
                    {currentStatusUi.messageIcon}

                    <p>{currentStatusUi.message}</p>
                </div>
            )}
        </TeamActionModal>
    );
};

export default AddMemberModal;
