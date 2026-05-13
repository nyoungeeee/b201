import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
    CheckCircleIcon,
    ErrorCircleIcon,
    InfoCircleIcon,
    PlusCircleIcon,
    XCircleIcon,
} from '../common/icons';
import { checkNicknameAvailability } from '../../apis/accountApi';
import { ADD_MEMBER_MODAL_TEXT } from '../../domains/team/constants';
import { useAuthSession } from '../../hooks/useAuthSession';
import TeamActionModal from './TeamActionModal';

interface AddMemberModalProps {
    existingMemberNicknames: string[];
    onCancel: () => void;
    onConfirm: (nickname: string) => void;
}

type AddMemberStatus =
    | 'empty'
    | 'typing'
    | 'checking'
    | 'invalid'
    | 'alreadyMember'
    | 'available';

interface StatusUi {
    inputClassName?: string;
    rightSlot?: ReactNode;
    messageIcon?: ReactNode;
    message?: string;
    messageClassName?: string;
}

const AddMemberModal = ({
    existingMemberNicknames,
    onCancel,
    onConfirm,
}: AddMemberModalProps) => {
    const { accessToken } = useAuthSession();
    const [nickname, setNickname] = useState('');
    const [status, setStatus] =
        useState<AddMemberStatus>('empty');
    const existingMemberNicknameSet = useMemo(
        () =>
            new Set(
                existingMemberNicknames.map((memberNickname) =>
                    memberNickname.trim(),
                ),
            ),
        [existingMemberNicknames],
    );

    useEffect(() => {
        const trimmedNickname = nickname.trim();

        if (!trimmedNickname) return;
        if (existingMemberNicknameSet.has(trimmedNickname)) return;

        let isCurrent = true;

        const timerId = window.setTimeout(() => {
            setStatus('checking');

            if (!accessToken) {
                setStatus('invalid');
                return;
            }

            checkNicknameAvailability({
                nickname: trimmedNickname,
                accessToken,
            })
                .then((isNicknameAvailable) => {
                    if (!isCurrent) return;

                    setStatus(
                        isNicknameAvailable ? 'invalid' : 'available',
                    );
                })
                .catch((error) => {
                    if (!isCurrent) return;

                    console.error('Nickname check failed:', error);
                    setStatus('invalid');
                });
        }, 350);

        return () => {
            isCurrent = false;
            window.clearTimeout(timerId);
        };
    }, [accessToken, existingMemberNicknameSet, nickname]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = e.target.value;

        setNickname(value);

        if (!value.trim()) {
            setStatus('empty');
            return;
        }

        if (existingMemberNicknameSet.has(value.trim())) {
            setStatus('alreadyMember');
            return;
        }

        setStatus('typing');
    };

    const handleClear = () => {
        setNickname('');
        setStatus('empty');
    };

    const handleConfirm = () => {
        if (status !== 'available') return;

        onConfirm(nickname.trim());
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

        alreadyMember: {
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
            message: ADD_MEMBER_MODAL_TEXT.alreadyMemberMessage,
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
