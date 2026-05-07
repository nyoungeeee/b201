import type { ReactNode } from 'react';
import { useState } from 'react';

import {
    CheckCircleIcon,
    ErrorCircleIcon,
    InfoCircleIcon,
    PlusCircleIcon,
    XCircleIcon,
} from '../common/icons';

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
                    className="team-modal__input-action"
                    onClick={handleClear}
                    aria-label="입력값 지우기"
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
            message: '닉네임을 확인하고 있어요...',
        },

        invalid: {
            inputClassName: 'is-invalid',
            rightSlot: (
                <button
                    type="button"
                    className="team-modal__input-action"
                    onClick={handleClear}
                    aria-label="입력값 지우기"
                >
                    <ErrorCircleIcon size={18} />
                </button>
            ),
            messageIcon: <ErrorCircleIcon size={14} />,
            message:
                '존재하지 않는 닉네임이에요. 다시 확인해주세요.',
            messageClassName: 'is-error',
        },

        available: {
            inputClassName: 'is-available',
            rightSlot: <CheckCircleIcon size={18} />,
            messageIcon: <CheckCircleIcon size={14} />,
            message: '팀에 추가할 수 있는 멤버예요.',
            messageClassName: 'is-success',
        },
    };

    const currentStatusUi = statusUi[status];
    const isConfirmDisabled = status !== 'available';

    return (
        <div className="team-modal">
            <div
                className="team-modal__backdrop"
                onClick={onCancel}
            />

            <section className="team-modal__panel">
                <PlusCircleIcon size={54} />

                <h2 className="team-modal__title">
                    팀 멤버 추가
                </h2>

                <p className="team-modal__description">
                    추가하려는 멤버의 닉네임을 입력해주세요.
                    <span>
                        추가한 팀원은 즉시 팀 멤버로 등록되고,
                        <br />
                        팀 예약 조회/신청/취소 권한이 부여됩니다.
                    </span>
                </p>

                <div
                    className={`
                        team-modal__input
                        ${currentStatusUi.inputClassName ?? ''}
                    `}
                >
                    <input
                        type="text"
                        value={nickname}
                        onChange={handleChange}
                        placeholder="닉네임을 정확히 입력해주세요."
                    />

                    {currentStatusUi.rightSlot}
                </div>

                {currentStatusUi.message && (
                    <div
                        className={`
                            team-modal__message
                            ${currentStatusUi.messageClassName ?? ''}
                        `}
                    >
                        {currentStatusUi.messageIcon}

                        <p>{currentStatusUi.message}</p>
                    </div>
                )}

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
                        className="team-modal__button team-modal__button--primary"
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                    >
                        추가
                    </button>
                </div>
            </section>
        </div>
    );
};

export default AddMemberModal;