import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/B201_header_logo.png';
import { InfoCircleIcon } from '../components/common/icons';
import CheckCircleIcon from '../components/common/icons/CheckCircleIcon';
import ErrorCircleIcon from '../components/common/icons/ErrorCircleIcon';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import { DUMMY_NICKNAME, MAX_LENGTH } from '../constants/global';
import { getNicknameLength, isValidNickname } from '../utils/commonUtils';

type NicknameCheckStatus = 'unchecked' | 'available' | 'unavailable';

const NicknameEditPage = () => {
    const handleClear = () => {
        setNickname('');
        setCheckStatus('unchecked');
    };

    const navigate = useNavigate();
    const [nickname, setNickname] = useState('');
    const [checkStatus, setCheckStatus] =
        useState<NicknameCheckStatus>('unchecked');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value)) return;

        if (getNicknameLength(value) <= MAX_LENGTH) {
            setNickname(value);
            setCheckStatus('unchecked');
        }
    };

    const handleCheckNickname = () => {
        if (!isValidNickname(nickname)) return;

        // TODO: 추후 닉네임 중복 검사 API로 교체
        const isDuplicated = DUMMY_NICKNAME.includes(nickname);
        setCheckStatus(isDuplicated ? 'unavailable' : 'available');
    };

    const handleSubmit = () => {
        if (checkStatus !== 'available') return;

        // TODO: 추후 닉네임 변경 API 호출 후 성공 시 이동
        navigate('/my', {
            state: {
                toastMessage: '닉네임이 변경되었어요.',
            },
        });
    };

    const isFormatValid = isValidNickname(nickname);
    const isAvailable = checkStatus === 'available';

    return (
        <MobilePageLayout>
            <div className="nickname-edit-page">
                <PageSubHeader />

                <main className="nickname-edit-page__content">
                    <img
                        src={logo}
                        alt="B201"
                        className="nickname-edit-page__logo"
                    />

                    <h1 className="nickname-edit-page__title">
                        서비스에서 사용할 닉네임을
                        <br />
                        입력해주세요.
                    </h1>

                    <section className="nickname-form">
                        <label className="nickname-form__label">
                            닉네임
                        </label>

                        <div className="nickname-form__row">
                            <div
                                className={[
                                    'nickname-form__input-wrap',
                                    checkStatus === 'available' &&
                                    'is-available',
                                    checkStatus === 'unavailable' &&
                                    'is-unavailable',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                <input
                                    className="nickname-form__input"
                                    value={nickname}
                                    onChange={handleChange}
                                    placeholder="닉네임을 입력해주세요"
                                />

                                {checkStatus !== 'unchecked' && (
                                    checkStatus === 'available' ? (
                                        <span className="nickname-form__status-icon">
                                            <CheckCircleIcon size={18} />
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            key={checkStatus}
                                            className="nickname-form__status-icon"
                                            onClick={handleClear}
                                            aria-label="입력값 지우기"
                                        >
                                            <ErrorCircleIcon size={18} />
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                type="button"
                                className="nickname-form__check-button"
                                disabled={!isFormatValid}
                                onClick={handleCheckNickname}
                            >
                                검사
                            </button>
                        </div>

                        {checkStatus === 'unavailable' && (
                            <div className='nickname-form__message-item'>
                                <InfoCircleIcon size={16} color="var(--text-error)" />
                                <p className="nickname-form__message is-error">
                                    사용할 수 없는 닉네임이에요.
                                </p>
                            </div>

                        )}

                        {checkStatus === 'available' && (
                            <div className='nickname-form__message-item'>
                                <InfoCircleIcon size={16} color="var(--text-success)" />
                                <p className="nickname-form__message is-success">
                                    사용 가능한 닉네임이에요!
                                </p>
                            </div>


                        )}

                        <div className="nickname-form__notice">
                            <div className="nickname-form__notice-item">
                                <InfoCircleIcon size={16} />
                                <p>
                                    최대 한글 8자, 영문 16자까지 입력
                                    가능해요.
                                </p>
                            </div>

                            <div className="nickname-form__notice-item">
                                <InfoCircleIcon size={16} />
                                <p>특수문자 및 공백은 사용할 수 없어요.</p>
                            </div>

                            <div className="nickname-form__notice-item">
                                <InfoCircleIcon size={16} />
                                <p>
                                    다른 사용자가 사용 중인 닉네임은 사용할 수
                                    없어요.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>

                <div className="nickname-edit-page__bottom">
                    <button
                        type="button"
                        className="nickname-edit-page__submit"
                        disabled={!isAvailable}
                        onClick={handleSubmit}
                    >
                        변경하기
                    </button>
                </div>
            </div>
        </MobilePageLayout>
    );
};

export default NicknameEditPage;