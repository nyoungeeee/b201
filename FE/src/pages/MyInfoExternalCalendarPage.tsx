import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/B201_header_logo.png';
import {
    CalendarPlusIcon,
    ClipboardCheckIcon,
    CopyIcon,
    InfoCircleIcon,
    LinkIcon,
    QuestionCircleIcon,
} from '../components/common/icons';
import ActionModal from '../components/layout/ActionModal';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import { useExternalCalendarSubscription } from '../hooks/queries/useExternalCalendarSubscription';
import { useAuthSession } from '../hooks/useAuthSession';

const EXTERNAL_CALENDAR_TEXT = {
    logoAlt: 'B201',
    title: (
        <>
            내 예약 일정을
            <br />
            Google Calendar에서
            <br />
            확인해보세요.
        </>
    ),
    description: (
        <>
            내가 신청한 예약과 소속된 팀 예약만
            <br />
            외부 캘린더에서 표시됩니다.
        </>
    ),
    subscriptionLabel: '구독 URL',
    subscriptionHelp: '구독 URL 도움말',
    copyAriaLabel: '구독 URL 복사',
    copyButton: '구독 URL 복사하기',
    copyToast: '구독 URL을 복사했어요.\n외부 캘린더에 URL을 추가하세요.',
    loadingUrl: '구독 URL을 불러오는 중이에요.',
    errorUrl: '구독 URL을 불러오지 못했어요.',
    guideTitle: 'Google Calendar 연동 방법',
    guideConfirm: '확인',
    guideNotice: '연동 후 일정 반영까지 시간이 걸릴 수 있어요.\n최신 예약 상태는 B201에서 확인해주세요.',
} as const;

const CALENDAR_GUIDE_STEPS = [
    {
        title: '구독 URL 복사하기',
        description: '‘구독 URL 복사하기’ 버튼을 눌러\nURL을 복사하세요.',
        Icon: ClipboardCheckIcon,
        iconSize: 32,
    },
    {
        title: 'Google Calendar에서\n다른 캘린더 추가',
        description: 'Google Calendar 앱 또는 웹에서\n‘다른 캘린더 추가’를 선택하세요.',
        Icon: CalendarPlusIcon,
        iconSize: 28,
    },
    {
        title: 'URL로 추가',
        description: '‘URL로 추가’를 선택한 뒤\n복사한 주소를 붙여넣고 추가하세요.',
        Icon: LinkIcon,
        iconSize: 28,
    },
] as const;

const NOTICES = [
    {
        text: '예약 변경이 되더라도 Google Calendar에 바로 반영되지 않을 수 있어요.',
        color: 'var(--text-error)',
    },
    {
        text: '외부 캘린더 구독은 읽기 전용이에요.',
        color: 'var(--text-muted)',
    },
    {
        text: '예약 신청과 취소는 B201에서만 가능해요.',
        color: 'var(--text-muted)',
    },
    {
        text: '최신 예약 상태는 B201에서 확인해주세요.',
        color: 'var(--text-muted)',
    },
] as const;

const MyInfoExternalCalendarPage = () => {
    const navigate = useNavigate();
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const { user } = useAuthSession();
    const {
        data: subscription,
        isError: isSubscriptionError,
    } = useExternalCalendarSubscription({
        userId: user?.id,
    });
    const subscriptionUrl = subscription?.icsUrl ?? '';
    const subscriptionUrlDisplay = isSubscriptionError
        ? EXTERNAL_CALENDAR_TEXT.errorUrl
        : subscriptionUrl || EXTERNAL_CALENDAR_TEXT.loadingUrl;

    const handleCopy = async () => {
        if (!subscriptionUrl) return;

        try {
            await navigator.clipboard.writeText(subscriptionUrl);
        } catch {
            const input = document.createElement('textarea');
            input.value = subscriptionUrl;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }

        navigate('.', {
            replace: true,
            state: {
                toastMessage: EXTERNAL_CALENDAR_TEXT.copyToast,
            },
        });
    };

    return (
        <MobilePageLayout>
            <div className="external-calendar-page">
                <PageSubHeader />

                <main className="external-calendar-page__content">
                    <img
                        src={logo}
                        alt={EXTERNAL_CALENDAR_TEXT.logoAlt}
                        className="external-calendar-page__logo"
                    />

                    <h1 className="external-calendar-page__title">
                        {EXTERNAL_CALENDAR_TEXT.title}
                    </h1>

                    <p className="external-calendar-page__description">
                        {EXTERNAL_CALENDAR_TEXT.description}
                    </p>

                    <section className="external-calendar-subscription">
                        <div className="form-label external-calendar-subscription__label">
                            <span>{EXTERNAL_CALENDAR_TEXT.subscriptionLabel}</span>
                            <button
                                type="button"
                                className="external-calendar-subscription__help"
                                aria-label={EXTERNAL_CALENDAR_TEXT.subscriptionHelp}
                                onClick={() => setIsGuideOpen(true)}
                            >
                                <QuestionCircleIcon size={18} />
                            </button>
                        </div>

                        <div className="form-input form-input--full external-calendar-subscription__url">
                            <input
                                className="form-input__control"
                                value={subscriptionUrlDisplay}
                                readOnly
                                aria-label={EXTERNAL_CALENDAR_TEXT.subscriptionLabel}
                            />
                            <button
                                type="button"
                                className="form-input__action"
                                onClick={handleCopy}
                                aria-label={EXTERNAL_CALENDAR_TEXT.copyAriaLabel}
                                disabled={!subscriptionUrl}
                            >
                                <CopyIcon size={19} />
                            </button>
                        </div>

                        <div className="info-box external-calendar-subscription__notices">
                            {NOTICES.map((notice) => (
                                <div className="info-box__item" key={notice.text}>
                                    <InfoCircleIcon size={18} color={notice.color} />
                                    <p style={{ color: notice.color }}>{notice.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <div className="bottom-action external-calendar-page__bottom">
                    <button
                        type="button"
                        className="bottom-action__button"
                        onClick={handleCopy}
                        disabled={!subscriptionUrl}
                    >
                        {EXTERNAL_CALENDAR_TEXT.copyButton}
                    </button>
                </div>

                {isGuideOpen && (
                    <ActionModal
                        title={EXTERNAL_CALENDAR_TEXT.guideTitle}
                        confirmText={EXTERNAL_CALENDAR_TEXT.guideConfirm}
                        showCancelButton={false}
                        panelClassName="external-calendar-guide"
                        onCancel={() => setIsGuideOpen(false)}
                        onConfirm={() => setIsGuideOpen(false)}
                    >
                        <ol className="external-calendar-guide__steps">
                            {CALENDAR_GUIDE_STEPS.map(({ title, description, Icon, iconSize }, index) => (
                                <li className="external-calendar-guide__step" key={title}>
                                    <div className="external-calendar-guide__icon">
                                        <Icon size={iconSize} />
                                    </div>
                                    <div className="external-calendar-guide__step-content">
                                        <span className="external-calendar-guide__number">
                                            {index + 1}
                                        </span>
                                        <h3>{title}</h3>
                                        <p>{description}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <div className="external-calendar-guide__notice">
                            <InfoCircleIcon size={18} />
                            <p>{EXTERNAL_CALENDAR_TEXT.guideNotice}</p>
                        </div>
                    </ActionModal>
                )}
            </div>
        </MobilePageLayout>
    );
};

export default MyInfoExternalCalendarPage;
