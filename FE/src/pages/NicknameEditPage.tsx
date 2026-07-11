import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    checkNicknameAvailability,
    updateMyNickname,
} from '../apis/accountApi';
import logo from '../assets/B201_header_logo.png';
import { InfoCircleIcon } from '../components/common/icons';
import CheckCircleIcon from '../components/common/icons/CheckCircleIcon';
import ErrorCircleIcon from '../components/common/icons/ErrorCircleIcon';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import { MAX_LENGTH } from '../constants/global';
import { useRefreshAuthUser } from '../hooks/useRefreshAuthUser';
import { useAuthSession } from '../hooks/useAuthSession';
import { saveAuthUser } from '../utils/authStorage';
import { getNicknameLength, isValidNickname } from '../utils/commonUtils';

type NicknameCheckStatus = 'unchecked' | 'available' | 'unavailable';

const NICKNAME_TEXT = {
    title: (
        <>
            서비스에서 사용할 닉네임을
            <br />
            입력해주세요.
        </>
    ),
    label: '닉네임',
    placeholder: '닉네임을 입력해주세요',
    checkButton: '검사',
    submitButton: '변경하기',
    clearAriaLabel: '입력값 지우기',
    toastMessage: '닉네임이 변경되었어요.',
    unavailableMessage: '사용할 수 없는 닉네임이에요.',
    availableMessage: '사용 가능한 닉네임이에요!',
    notices: [
        '최대 한글 8자, 영문 16자까지 입력 가능해요.',
        '특수문자 및 공백은 사용할 수 없어요.',
        '다른 사용자가 사용 중인 닉네임은 사용할 수 없어요.',
    ],
} as const;

const NICKNAME_REGEX = {
    invalidCharacter: /[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/,
} as const;

const NICKNAME_MESSAGE = {
    available: {
        className: 'is-success',
        color: 'var(--text-success)',
        text: NICKNAME_TEXT.availableMessage,
    },
    unavailable: {
        className: 'is-error',
        color: 'var(--text-error)',
        text: NICKNAME_TEXT.unavailableMessage,
    },
} as const;

const getInputWrapClassName = (checkStatus: NicknameCheckStatus) =>
    [
        'form-input',
        'form-input--fill',
        checkStatus === 'unavailable' && 'is-error',
        checkStatus === 'available' && 'is-available',
        checkStatus === 'unavailable' && 'is-unavailable',
    ]
        .filter(Boolean)
        .join(' ');

const getNicknameMessage = (checkStatus: NicknameCheckStatus) => {
    if (checkStatus === 'unchecked') return null;

    return NICKNAME_MESSAGE[checkStatus];
};

const NicknameEditPage = () => {
    const navigate = useNavigate();
    const { isRefreshing, refreshAuthUser } = useRefreshAuthUser();
    const { accessToken, user } = useAuthSession();

    const [nickname, setNickname] = useState(user?.nickname ?? '');
    const [checkStatus, setCheckStatus] =
        useState<NicknameCheckStatus>('unchecked');
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setNickname(user?.nickname ?? '');
    }, [user?.nickname]);

    const trimmedNickname = nickname.trim();
    const isFormatValid = isValidNickname(trimmedNickname);
    const isAvailable = checkStatus === 'available';
    const nicknameMessage = getNicknameMessage(checkStatus);
    const isBusy = isChecking || isSubmitting;

    const handleClear = () => {
        setNickname('');
        setCheckStatus('unchecked');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (NICKNAME_REGEX.invalidCharacter.test(value)) return;
        if (getNicknameLength(value) > MAX_LENGTH) return;

        setNickname(value);
        setCheckStatus('unchecked');
    };

    const handleCheckNickname = async () => {
        if (!isFormatValid) return;

        if (!accessToken) {
            console.error('Nickname check requires login.');
            return;
        }

        try {
            setIsChecking(true);

            const available = await checkNicknameAvailability({
                nickname: trimmedNickname,
                accessToken,
            });

            setCheckStatus(available ? 'available' : 'unavailable');
        } catch (error) {
            console.error('Nickname check failed:', error);
            setCheckStatus('unchecked');
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async () => {
        if (!isAvailable || !accessToken) return;

        try {
            setIsSubmitting(true);

            const updatedUser = await updateMyNickname({
                nickname: trimmedNickname,
                accessToken,
            });

            saveAuthUser(updatedUser);

            navigate('/my', {
                state: {
                    toastMessage: NICKNAME_TEXT.toastMessage,
                },
            });
        } catch (error) {
            console.error('Nickname update failed:', error);
            setCheckStatus('unavailable');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MobilePageLayout
            isRefreshing={isRefreshing}
            onRefresh={refreshAuthUser}
        >
            <div className="nickname-edit-page">
                <PageSubHeader />

                <main className="nickname-edit-page__content">
                    <img
                        src={logo}
                        alt="B201"
                        className="nickname-edit-page__logo"
                    />

                    <h1 className="nickname-edit-page__title">
                        {NICKNAME_TEXT.title}
                    </h1>

                    <section className="nickname-form">
                        <label className="form-label">
                            {NICKNAME_TEXT.label}
                        </label>

                        <div className="nickname-form__row">
                            <div className={getInputWrapClassName(checkStatus)}>
                                <input
                                    className="form-input__control nickname-form__input"
                                    value={nickname}
                                    onChange={handleChange}
                                    placeholder={NICKNAME_TEXT.placeholder}
                                    disabled={isBusy}
                                />

                                {checkStatus === 'available' && (
                                    <span className="form-input__action nickname-form__status-icon">
                                        <CheckCircleIcon size={18} />
                                    </span>
                                )}

                                {checkStatus === 'unavailable' && (
                                    <button
                                        type="button"
                                        className="form-input__action nickname-form__status-icon"
                                        onClick={handleClear}
                                        aria-label={NICKNAME_TEXT.clearAriaLabel}
                                        disabled={isBusy}
                                    >
                                        <ErrorCircleIcon size={18} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                className="nickname-form__check-button"
                                disabled={!isFormatValid || isBusy}
                                onClick={handleCheckNickname}
                            >
                                {NICKNAME_TEXT.checkButton}
                            </button>
                        </div>

                        {nicknameMessage && (
                            <div className="form-message nickname-form__message-item">
                                <InfoCircleIcon
                                    size={16}
                                    color={nicknameMessage.color}
                                />
                                <p
                                    className={`nickname-form__message ${nicknameMessage.className}`}
                                >
                                    {nicknameMessage.text}
                                </p>
                            </div>
                        )}

                        <div className="info-box nickname-form__notice">
                            {NICKNAME_TEXT.notices.map((notice) => (
                                <div
                                    key={notice}
                                    className="info-box__item nickname-form__notice-item"
                                >
                                    <InfoCircleIcon size={16} />
                                    <p>{notice}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <div className="bottom-action nickname-edit-page__bottom">
                    <button
                        type="button"
                        className="bottom-action__button nickname-edit-page__submit"
                        disabled={!isAvailable || isBusy}
                        onClick={handleSubmit}
                    >
                        {NICKNAME_TEXT.submitButton}
                    </button>
                </div>
            </div>
        </MobilePageLayout>
    );
};

export default NicknameEditPage;
