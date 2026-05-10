import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/B201_header_logo.png';
import { InfoCircleIcon } from '../components/common/icons';
import CheckCircleIcon from '../components/common/icons/CheckCircleIcon';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';

import '../styles/withdraw.css';

type WithdrawNotice = {
    text: string;
    isWarning?: boolean;
};

const WITHDRAW_TEXT = {
    logoAlt: 'B201',
    title: '정말 탈퇴하시나요?',
    description: '탈퇴 전 아래 내용을 꼭 확인해주세요.',
    confirmText: '위 내용을 모두 확인했으며 회원탈퇴에 동의합니다.',
    submitButton: '탈퇴 신청하기',
    toastMessage: '회원탈퇴가 완료되었어요.',
} as const;

const WITHDRAW_NOTICE_LIST: WithdrawNotice[] = [
    {
        text: '탈퇴 시 정보는 초기화되며, 다시 연결되지 않아요.',
        isWarning: true,
    },
    {
        text: '탈퇴하면 서비스 이용이 즉시 종료돼요.',
    },
    {
        text: '다시 가입해도 이전 정보는 이어지지 않아요.',
    },
    {
        text: '나와 연결된 팀 소속과 활동 정보가 초기화돼요.',
    },
    {
        text: '이미 신청한 예약은 유지되지만, 더 이상 직접 변경할 수 없어요.',
    },
];

const WITHDRAW_COLOR = {
    warning: 'var(--text-error)',
    checked: 'var(--accent-primary)',
    unchecked: 'var(--text-muted)',
} as const;

const getNoticeTextClassName = (isWarning?: boolean) =>
    isWarning ? 'is-warning' : '';

const getNoticeIconColor = (isWarning?: boolean) =>
    isWarning ? WITHDRAW_COLOR.warning : undefined;

const getCheckIconColor = (isChecked: boolean) =>
    isChecked ? WITHDRAW_COLOR.checked : WITHDRAW_COLOR.unchecked;

const WithdrawPage = () => {
    const navigate = useNavigate();

    const [isChecked, setIsChecked] = useState(false);

    const handleToggle = () => {
        setIsChecked((prev) => !prev);
    };

    const handleSubmit = () => {
        if (!isChecked) return;

        // TODO: 추후 회원탈퇴 API 호출 후 성공 시 이동
        navigate('/', {
            state: {
                toastMessage: WITHDRAW_TEXT.toastMessage,
            },
        });
    };

    return (
        <MobilePageLayout>
            <div className="withdraw-page">
                <PageSubHeader />

                <main className="withdraw-page__content">
                    <img
                        src={logo}
                        alt={WITHDRAW_TEXT.logoAlt}
                        className="withdraw-page__logo"
                    />

                    <h1 className="withdraw-page__title">
                        {WITHDRAW_TEXT.title}
                    </h1>

                    <p className="withdraw-page__description">
                        {WITHDRAW_TEXT.description}
                    </p>

                    <section className="withdraw-notice">
                        {WITHDRAW_NOTICE_LIST.map((notice) => (
                            <div
                                key={notice.text}
                                className="withdraw-notice__item"
                            >
                                <InfoCircleIcon
                                    size={16}
                                    color={getNoticeIconColor(
                                        notice.isWarning,
                                    )}
                                />

                                <p
                                    className={getNoticeTextClassName(
                                        notice.isWarning,
                                    )}
                                >
                                    {notice.text}
                                </p>
                            </div>
                        ))}
                    </section>

                    <button
                        type="button"
                        className="withdraw-confirm"
                        onClick={handleToggle}
                    >
                        <CheckCircleIcon
                            size={16}
                            color={getCheckIconColor(isChecked)}
                        />

                        <span>{WITHDRAW_TEXT.confirmText}</span>
                    </button>
                </main>

                <div className="withdraw-page__bottom">
                    <button
                        type="button"
                        className="withdraw-page__submit"
                        disabled={!isChecked}
                        onClick={handleSubmit}
                    >
                        {WITHDRAW_TEXT.submitButton}
                    </button>
                </div>
            </div>
        </MobilePageLayout>
    );
};

export default WithdrawPage;