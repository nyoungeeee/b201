import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import { ChevronRightIcon } from '../components/common/icons';
import CheckCircleIcon from '../components/common/icons/CheckCircleIcon';
import InfoCircleIcon from '../components/common/icons/InfoCircleIcon';
import MinusCircleIcon from '../components/common/icons/MinusCircleIcon';
import XCircleIcon from '../components/common/icons/XCircleIcon';
import ActionModal from '../components/layout/ActionModal';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageRefreshButton from '../components/layout/PageRefreshButton';
import PageSubHeader from '../components/layout/PageSubHeader';
import {
    getReservationByNumber,
} from '../apis/reservationApi';
import {
    formatAppliedAt,
    getCardStyle,
    getPeriodLabel,
    getReservationStateView,
    getTimeLabel,
} from '../domains/reservation/formatters';
import { mapReservationDetail } from '../domains/reservation/mapper';
import {
    createRepeatRoundReservation,
    mapReservationDetailRounds,
    type RepeatRound,
    type RepeatRoundStatus,
} from '../domains/reservation/repeatRounds';
import type {
    MyReservation,
    ReservationListViewState,
} from '../domains/reservation/types';
import { useCancelReservation } from '../hooks/mutations/useReservationMutations';
import { useAuthSession } from '../hooks/useAuthSession';
import { roomDayQueryKeys } from '../hooks/queries/useRoomDay';
import { roomMonthQueryKeys } from '../hooks/queries/useRoomMonth';
import { reservationQueryKeys } from '../hooks/queries/useReservations';
import { queryClient } from '../lib/queryClient';

type ProgressTone = 'success' | 'pending' | 'danger' | 'muted' | 'blue' | 'primary';
type ProgressIcon = 'check' | 'x' | 'minus';

interface ProgressStep {
    label: string;
    description: string;
    meta?: string;
    tone: ProgressTone;
    icon: ProgressIcon;
    connectorTone?: ProgressTone;
}

interface ProgressStepLabels {
    application?: string;
    upcoming?: string;
}

type RepeatRoundFilter = 'all' | 'approved' | 'conflict' | 'canceled';

const PROGRESS_TONE_COLOR: Record<ProgressTone, string> = {
    success: 'var(--text-success)',
    pending: 'var(--accent-primary)',
    danger: 'var(--text-error)',
    muted: 'var(--text-muted)',
    blue: 'var(--accent-info)',
    primary: 'var(--text-primary)',
};

const REPEAT_STATUS_VIEW: Record<RepeatRoundStatus, {
    label: string;
    tone: ProgressTone;
    color: string;
}> = {
    pending: {
        label: '승인 대기',
        tone: 'pending',
        color: 'var(--accent-primary)',
    },
    completed: {
        label: '이용 완료',
        tone: 'blue',
        color: 'var(--accent-info)',
    },
    approved: {
        label: '승인됨',
        tone: 'success',
        color: 'var(--text-success)',
    },
    rejected: {
        label: '거절',
        tone: 'danger',
        color: 'var(--text-error)',
    },
    conflict: {
        label: '충돌로 미신청',
        tone: 'danger',
        color: 'var(--text-error)',
    },
    canceled: {
        label: '취소',
        tone: 'muted',
        color: 'var(--text-muted)',
    },
};

const formatDetailDateTime = (value: string) => {
    const date = new Date(value);
    const pad2 = (number: number) => String(number).padStart(2, '0');

    return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const formatRepeatDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const pad2 = (number: number) => String(number).padStart(2, '0');

    return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}(${dayLabels[date.getDay()]})`;
};

const getApprovedAtLabel = (approvedAt?: string) => (
    approvedAt ? formatDetailDateTime(approvedAt) : '-'
);

const getCanceledByLabel = (canceledBy?: string) => canceledBy ?? '-';

const getRepeatRoundStateView = (round: RepeatRound) => {
    if (round.status === 'completed') {
        return {
            label: '이용완료',
            className: 'completed',
        };
    }

    if (round.status === 'canceled') {
        return {
            label: '취소',
            className: 'canceled',
        };
    }
    if (round.status === 'pending') {
        return {
            label: '승인대기',
            className: 'pending',
        };
    }
    if (round.status === 'rejected') {
        return {
            label: '거절',
            className: 'rejected',
        };
    }

    return {
        label: '승인',
        className: 'approved',
    };
};

const getRepeatRoundDisplayView = (round: RepeatRound) => REPEAT_STATUS_VIEW[round.status];

const getUsageLabel = (reservation: MyReservation, now: Date) => {
    const startAt = new Date(reservation.startAt);
    const endAt = new Date(reservation.endAt);

    if (now < startAt) return '이용 예정';
    if (now <= endAt) return '이용 중';

    return '이용 시간';
};

const getProgressSteps = (
    reservation: MyReservation,
    now: Date,
    labels: ProgressStepLabels = {},
): ProgressStep[] => {
    const startAt = new Date(reservation.startAt);
    const endAt = new Date(reservation.endAt);
    const isPastUse = now > endAt;
    const isUsing = now >= startAt && now <= endAt;
    const applicationLabel = labels.application ?? '예약 신청';
    const upcomingLabel = labels.upcoming ?? '이용 예정';

    if (reservation.state === 'approved' && isPastUse) {
        return [
            {
                label: applicationLabel,
                description: formatDetailDateTime(reservation.appliedAt),
                tone: 'blue',
                icon: 'check',
                connectorTone: 'blue',
            },
            {
                label: '승인 완료',
                description: getApprovedAtLabel(reservation.approvedAt),
                tone: 'blue',
                icon: 'check',
                connectorTone: 'blue',
            },
            {
                label: '이용 시간',
                description: getTimeLabel(reservation),
                tone: 'blue',
                icon: 'check',
                connectorTone: 'blue',
            },
            {
                label: '이용 완료',
                description: formatDetailDateTime(reservation.endAt),
                tone: 'blue',
                icon: 'check',
            },
        ];
    }

    if (reservation.state === 'approved') {
        return [
            {
                label: applicationLabel,
                description: formatDetailDateTime(reservation.appliedAt),
                tone: 'success',
                icon: 'check',
                connectorTone: 'success',
            },
            {
                label: '승인 완료',
                description: getApprovedAtLabel(reservation.approvedAt),
                tone: 'success',
                icon: 'check',
                connectorTone: 'success',
            },
            {
                label: getUsageLabel(reservation, now),
                description: getTimeLabel(reservation),
                tone: isUsing ? 'success' : 'muted',
                icon: 'check',
                connectorTone: isUsing ? 'success' : 'muted',
            },
            {
                label: '이용 완료',
                description: '-',
                tone: 'muted',
                icon: 'check',
            },
        ];
    }

    if (reservation.state === 'pending') {
        return [
            {
                label: applicationLabel,
                description: formatDetailDateTime(reservation.appliedAt),
                tone: 'pending',
                icon: 'check',
                connectorTone: 'pending',
            },
            {
                label: '승인 대기 중',
                description: '관리자가 승인한 후, 예약이 확정돼요.',
                tone: 'muted',
                icon: 'check',
                connectorTone: 'muted',
            },
            {
                label: upcomingLabel,
                description: '-',
                tone: 'muted',
                icon: 'check',
                connectorTone: 'muted',
            },
            {
                label: '이용 완료',
                description: '-',
                tone: 'muted',
                icon: 'check',
            },
        ];
    }

    if (reservation.state === 'rejected') {
        return [
            {
                label: applicationLabel,
                description: formatDetailDateTime(reservation.appliedAt),
                tone: 'danger',
                icon: 'check',
                connectorTone: 'danger',
            },
            {
                label: '승인 거절',
                description: '다른 날짜와 시간으로 신청해주세요.',
                tone: 'danger',
                icon: 'x',
                connectorTone: 'muted',
            },
            {
                label: upcomingLabel,
                description: '-',
                tone: 'muted',
                icon: 'minus',
                connectorTone: 'muted',
            },
            {
                label: '이용 완료',
                description: '-',
                tone: 'muted',
                icon: 'minus',
            },
        ];
    }

    return [
        {
            label: applicationLabel,
            description: formatDetailDateTime(reservation.appliedAt),
            tone: 'primary',
            icon: 'check',
            connectorTone: 'primary',
        },
        {
            label: '예약 취소',
            description: reservation.canceledAt
                ? formatDetailDateTime(reservation.canceledAt)
                : formatDetailDateTime(reservation.appliedAt),
            meta: `취소자 ${getCanceledByLabel(reservation.canceledBy)}`,
            tone: 'primary',
            icon: 'x',
            connectorTone: 'muted',
        },
        {
            label: upcomingLabel,
            description: '-',
            tone: 'muted',
            icon: 'minus',
            connectorTone: 'muted',
        },
        {
            label: '이용 완료',
            description: '-',
            tone: 'muted',
            icon: 'minus',
        },
    ];
};

const getRepeatRoundProgressSteps = (
    reservation: MyReservation,
    round: RepeatRound,
    now: Date,
): ProgressStep[] => {
    const roundReservation = createRepeatRoundReservation(reservation, round);
    const startAt = new Date(roundReservation.startAt);
    const endAt = new Date(roundReservation.endAt);
    const isPastUse = round.status === 'completed' || now > endAt;
    const isUsing = now >= startAt && now <= endAt;
    const usageLabel = isPastUse
        ? '이용 시간'
        : isUsing
            ? '이용 중'
            : `이용 예정(${round.round}회차)`;

    if (
        round.status === 'canceled' ||
        round.status === 'rejected' ||
        round.status === 'pending'
    ) {
        return getProgressSteps(roundReservation, now, {
            application: '반복 예약 신청',
            upcoming: `이용 예정(${round.round}회차)`,
        });
    }

    if (isPastUse) {
        return [
            {
                label: '반복 예약 신청',
                description: formatDetailDateTime(reservation.appliedAt),
                tone: 'blue',
                icon: 'check',
                connectorTone: 'blue',
            },
            {
                label: '승인 완료',
                description: getApprovedAtLabel(round.approvedAt),
                tone: 'blue',
                icon: 'check',
                connectorTone: 'blue',
            },
            {
                label: '이용 시간',
                description: getTimeLabel(roundReservation),
                tone: 'blue',
                icon: 'check',
                connectorTone: 'blue',
            },
            {
                label: '이용 완료',
                description: formatDetailDateTime(roundReservation.endAt),
                tone: 'blue',
                icon: 'check',
            },
        ];
    }

    return [
        {
            label: '반복 예약 신청',
            description: formatDetailDateTime(reservation.appliedAt),
            tone: 'success',
            icon: 'check',
            connectorTone: 'success',
        },
        {
            label: '승인 완료',
            description: getApprovedAtLabel(round.approvedAt),
            tone: 'success',
            icon: 'check',
            connectorTone: 'success',
        },
        {
            label: usageLabel,
            description: isUsing ? getTimeLabel(roundReservation) : '-',
            tone: isUsing ? 'success' : 'muted',
            icon: 'check',
            connectorTone: isUsing ? 'success' : 'muted',
        },
        {
            label: '이용 완료',
            description: '-',
            tone: 'muted',
            icon: 'check',
        },
    ];
};

const getCancelInfo = (reservation: MyReservation, now: Date) => {
    const startAt = new Date(reservation.startAt);
    const canCancel =
        (reservation.state === 'pending' || reservation.state === 'approved') &&
        now < startAt;

    if (canCancel) {
        return {
            canCancel,
            title: `${formatDetailDateTime(reservation.startAt)} 까지`,
            description: '(시작 시간 전까지 취소 가능)',
        };
    }

    return {
        canCancel,
        title: '이 예약은 취소할 수 없어요.',
        description: '다시 예약을 원하시면 새로 신청해주세요.',
    };
};

const renderProgressIcon = (step: ProgressStep) => {
    const color = PROGRESS_TONE_COLOR[step.tone];

    if (step.icon === 'x') {
        return <XCircleIcon size={22} color={color} />;
    }

    if (step.icon === 'minus') {
        return <MinusCircleIcon size={22} color={color} />;
    }

    return <CheckCircleIcon size={22} color={color} />;
};

const renderRepeatRoundIcon = (status: RepeatRoundStatus, color: string) => {
    if (status === 'canceled') {
        return <MinusCircleIcon size={22} color={color} />;
    }

    return <CheckCircleIcon size={22} color={color} />;
};

const DetailShell = ({
    title,
    onBack,
    onRefresh,
    isRefreshing,
    children,
}: {
    title: string;
    onBack?: () => void;
    onRefresh?: () => void | Promise<unknown>;
    isRefreshing?: boolean;
    children: ReactNode;
}) => (
    <MobilePageLayout
        header={(
            <PageSubHeader
                title={title}
                onBack={onBack}
                rightContent={onRefresh && (
                    <PageRefreshButton
                        isRefreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                )}
            />
        )}
    >
        <div className="my-reservation-detail-shell">
            <main className="my-reservation-detail-page">
                {children}
            </main>
            <BottomHero />
        </div>
    </MobilePageLayout>
);

const ReservationSummaryCard = ({
    reservation,
    stateView,
    showRepeatBadge,
}: {
    reservation: MyReservation;
    stateView: { label: string; className: string };
    showRepeatBadge?: boolean;
}) => (
    <article
        className={[
            'my-reservation-card',
            showRepeatBadge ? 'my-reservation-repeat-card' : 'my-reservation-detail-card',
            `my-reservation-card--${reservation.kind}`,
        ].join(' ')}
        style={getCardStyle(reservation)}
    >
        <div className="my-reservation-card__top">
            <span
                className={[
                    'my-reservation-card__state',
                    `my-reservation-card__state--${stateView.className}`,
                ].join(' ')}
            >
                {stateView.label}
            </span>
        </div>

        <div className="my-reservation-card__title-row">
            <span
                className="my-reservation-card__dot"
                style={{ backgroundColor: reservation.color }}
            />
            <h2>{reservation.title}</h2>
            {showRepeatBadge && (
                <span className="my-reservation-card__repeat">
                    반복 예약
                </span>
            )}
        </div>

        <dl className="my-reservation-card__details">
            <div>
                <dt>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                    </svg>
                </dt>
                <dd>{getPeriodLabel(reservation)}</dd>
            </div>

            <div>
                <dt>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </dt>
                <dd>{getTimeLabel(reservation)}</dd>
            </div>
        </dl>

        <div className="my-reservation-card__meta">
            <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                </svg>
                신청자 {reservation.applicant}
            </span>
            <span className="my-reservation-card__applied-at">
                신청일 {formatAppliedAt(reservation.appliedAt)}
            </span>
        </div>
    </article>
);

const ProgressSection = ({
    steps,
    fallbackConnectorColor = undefined,
}: {
    steps: ProgressStep[];
    fallbackConnectorColor?: string;
}) => (
    <section className="my-reservation-detail-section">
        <h2>진행 상태</h2>

        <ol className="my-reservation-progress">
            {steps.map((step) => (
                <li
                    key={step.label}
                    className={[
                        'my-reservation-progress__item',
                        `is-${step.tone}`,
                    ].join(' ')}
                    style={{
                        '--progress-connector-color': step.connectorTone
                            ? PROGRESS_TONE_COLOR[step.connectorTone]
                            : fallbackConnectorColor ?? PROGRESS_TONE_COLOR[step.tone],
                    } as CSSProperties}
                >
                    <span className="my-reservation-progress__marker">
                        {renderProgressIcon(step)}
                    </span>
                    <div>
                        <strong>{step.label}</strong>
                        <p>
                            {step.description}
                            {step.meta && (
                                <span className="my-reservation-progress__meta">
                                    {step.meta}
                                </span>
                            )}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    </section>
);

const CancelInfoSection = ({
    cancelInfo,
    onCancel,
}: {
    cancelInfo: ReturnType<typeof getCancelInfo>;
    onCancel: () => void;
}) => (
    <section className="my-reservation-detail-section">
        <h2>취소 가능 시간</h2>
        <p className="my-reservation-cancel-info">
            {cancelInfo.title}
            <span>{cancelInfo.description}</span>
        </p>

        <button
            type="button"
            className="my-reservation-cancel-button"
            disabled={!cancelInfo.canCancel}
            onClick={onCancel}
        >
            예약 취소
        </button>
    </section>
);

const CancelReservationModal = ({
    reservation,
    errorMessage,
    isSubmitting,
    onCancel,
    onConfirm,
}: {
    reservation: MyReservation;
    errorMessage?: string | null;
    isSubmitting?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) => (
    <ActionModal
        icon={<InfoCircleIcon size={52} color="var(--text-error)" />}
        title="예약 취소"
        description={(
            <div className="my-reservation-cancel-modal__description">
                <p>{getPeriodLabel(reservation)}</p>
                <p>{getTimeLabel(reservation)}</p>
                <strong>
                    해당 예약을 정말 취소하시겠어요?
                    <br />
                    취소 후에는 되돌릴 수 없습니다.
                </strong>
                {errorMessage && (
                    <p className="my-reservation-cancel-modal__error" role="alert">
                        {errorMessage}
                    </p>
                )}
            </div>
        )}
        cancelText="돌아가기"
        confirmText={isSubmitting ? '취소하는 중...' : '예약 취소하기'}
        confirmVariant="danger"
        isCancelDisabled={isSubmitting}
        isConfirmDisabled={isSubmitting}
        onCancel={onCancel}
        onConfirm={onConfirm}
    />
);

const RepeatRoundDetail = ({
    reservation,
    round,
    now,
    onBack,
    onRefresh,
    isRefreshing,
    cancelError,
    isCancelSubmitting,
    onCancelRound,
}: {
    reservation: MyReservation;
    round: RepeatRound;
    now: Date;
    onBack: () => void;
    onRefresh?: () => void | Promise<unknown>;
    isRefreshing?: boolean;
    cancelError?: string | null;
    isCancelSubmitting?: boolean;
    onCancelRound: (round: RepeatRound) => void | Promise<unknown>;
}) => {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const roundReservation = createRepeatRoundReservation(reservation, round);
    const stateView = getRepeatRoundStateView(round);
    const progressSteps = getRepeatRoundProgressSteps(reservation, round, now);
    const cancelInfo = getCancelInfo(roundReservation, now);

    return (
        <DetailShell
            title="예약 상세보기"
            onBack={onBack}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
        >
            <ReservationSummaryCard
                reservation={roundReservation}
                stateView={stateView}
                showRepeatBadge
            />
            <ProgressSection steps={progressSteps} />
            <CancelInfoSection
                cancelInfo={cancelInfo}
                onCancel={() => setIsCancelModalOpen(true)}
            />

            {isCancelModalOpen && (
                <CancelReservationModal
                    reservation={roundReservation}
                    errorMessage={cancelError}
                    isSubmitting={isCancelSubmitting}
                    onCancel={() => setIsCancelModalOpen(false)}
                    onConfirm={() => onCancelRound(round)}
                />
            )}
        </DetailShell>
    );
};

const RepeatReservationDetail = ({
    reservation,
    initialRepeatRounds,
    onBack,
    onRefresh,
    isRefreshing,
    cancelError,
    isCancelSubmitting,
    onCancelRound,
    onReapplyRound,
}: {
    reservation: MyReservation;
    initialRepeatRounds?: RepeatRound[];
    onBack?: () => void;
    onRefresh?: () => void | Promise<unknown>;
    isRefreshing?: boolean;
    cancelError?: string | null;
    isCancelSubmitting?: boolean;
    onCancelRound: (round: RepeatRound) => Promise<boolean>;
    onReapplyRound: (round: RepeatRound) => void;
}) => {
    const [repeatFilter, setRepeatFilter] = useState<RepeatRoundFilter>('all');
    const [selectedRound, setSelectedRound] = useState<RepeatRound | null>(null);
    const now = useMemo(() => new Date(), []);
    const repeatRounds = initialRepeatRounds ?? [];
    const currentSelectedRound = selectedRound
        ? repeatRounds.find((round) => round.round === selectedRound.round) ?? selectedRound
        : null;
    const statusCounts = repeatRounds.reduce(
        (counts, round) => ({
            ...counts,
            [round.status]: counts[round.status] + 1,
        }),
        {
            pending: 0,
            completed: 0,
            approved: 0,
            rejected: 0,
            conflict: 0,
            canceled: 0,
        } as Record<RepeatRoundStatus, number>,
    );
    const approvedCount = statusCounts.approved + statusCounts.completed;
    const summaryState = repeatRounds.length === 0
        ? reservation.state
        : statusCounts.pending > 0
            ? 'pending'
            : approvedCount > 0
                ? 'approved'
                : statusCounts.rejected > 0
                    ? 'rejected'
                    : 'canceled';
    const summaryReservation = {
        ...reservation,
        state: summaryState,
    };
    const stateView = getReservationStateView(summaryReservation);
    const repeatFilterOptions: Array<{
        value: RepeatRoundFilter;
        label: string;
        count: number;
        tone: ProgressTone;
    }> = [
        {
            value: 'all',
            label: '전체',
            count: repeatRounds.length,
            tone: 'primary',
        },
        {
            value: 'approved',
            label: '승인',
            count: approvedCount,
            tone: 'success',
        },
        {
            value: 'conflict',
            label: '충돌',
            count: statusCounts.conflict,
            tone: 'danger',
        },
        {
            value: 'canceled',
            label: '취소',
            count: statusCounts.canceled,
            tone: 'muted',
        },
    ];
    const filteredRepeatRounds = repeatRounds.filter((round) => {
        if (repeatFilter === 'all') return true;
        if (repeatFilter === 'approved') {
            return round.status === 'approved' || round.status === 'completed';
        }

        return round.status === repeatFilter;
    });
    const repeatRoundListTitle: Record<RepeatRoundFilter, string> = {
        all: '전체 회차',
        approved: '승인된 회차',
        conflict: '충돌한 회차',
        canceled: '취소된 회차',
    };
    const repeatRoundEmptyMessage: Partial<Record<RepeatRoundFilter, string>> = {
        approved: '아직 예약이 승인되지 않았어요.',
        conflict: '예약 충돌한 회차가 없어요.',
        canceled: '취소된 회차가 없어요.',
    };

    if (currentSelectedRound) {
        return (
            <RepeatRoundDetail
                reservation={reservation}
                round={currentSelectedRound}
                now={now}
                onBack={() => setSelectedRound(null)}
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
                cancelError={cancelError}
                isCancelSubmitting={isCancelSubmitting}
                onCancelRound={async (round) => {
                    if (await onCancelRound(round)) {
                        setRepeatFilter('all');
                        setSelectedRound(null);
                    }
                }}
            />
        );
    }

    return (
        <DetailShell
            title="반복 예약 상세보기"
            onBack={onBack}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
        >
            <ReservationSummaryCard
                reservation={summaryReservation}
                stateView={stateView}
                showRepeatBadge
            />

            <section className="my-reservation-repeat-notice">
                <InfoCircleIcon size={18} color="var(--text-muted)" />
                <p>반복 예약은 각 회차별 개별적으로 취소할 수 있어요.</p>
            </section>

            <section className="my-reservation-repeat-summary" aria-label="반복 예약 요약">
                {repeatFilterOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={[
                            `is-${option.tone}`,
                            repeatFilter === option.value ? 'is-active' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setRepeatFilter(option.value)}
                    >
                        {option.label} {option.count}
                    </button>
                ))}
            </section>

            {filteredRepeatRounds.length > 0 ? (
                <section className="my-reservation-repeat-rounds">
                    <h2>{repeatRoundListTitle[repeatFilter]}</h2>

                    <ol className="my-reservation-repeat-timeline">
                        {filteredRepeatRounds.map((round, index) => {
                            const statusView = getRepeatRoundDisplayView(round);
                            const nextRound = filteredRepeatRounds[index + 1];
                            const nextStatusView = nextRound
                                ? getRepeatRoundDisplayView(nextRound)
                                : statusView;

                            return (
                                <li
                                    key={round.round}
                                    className={[
                                        'my-reservation-repeat-timeline__item',
                                        `is-${statusView.tone}`,
                                        round.status !== 'conflict' ? 'is-clickable' : '',
                                    ].join(' ')}
                                    style={{
                                        '--repeat-round-color': statusView.color,
                                        '--repeat-next-round-color': nextStatusView.color,
                                    } as CSSProperties}
                                    onClick={round.status !== 'conflict'
                                        ? () => setSelectedRound(round)
                                        : undefined}
                                >
                                    <span className="my-reservation-repeat-timeline__marker">
                                        {renderRepeatRoundIcon(round.status, statusView.color)}
                                    </span>

                                    <div className="my-reservation-repeat-timeline__content">
                                        <p>
                                            <strong>{formatRepeatDate(round.date)}</strong>
                                            <span>{round.startTime} - {round.endTime}</span>
                                        </p>
                                        <em>{round.round}회차 {statusView.label}</em>
                                        {repeatFilter === 'conflict' && round.status === 'conflict' && (
                                            <small>
                                                해당 시간에 이미 다른 예약이 있어 신청되지 않았어요.
                                            </small>
                                        )}
                                    </div>

                                    {round.status === 'conflict' ? (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onReapplyRound(round);
                                            }}
                                        >
                                            다시 신청
                                        </button>
                                    ) : (
                                        <span
                                            className="my-reservation-repeat-timeline__arrow"
                                            aria-hidden="true"
                                        >
                                            <ChevronRightIcon />
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ) : (
                <p className="my-reservation-repeat-empty">
                    {repeatRoundEmptyMessage[repeatFilter]}
                </p>
            )}
        </DetailShell>
    );
};

const MyReservationDetailPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { accessToken } = useAuthSession();
    const { reservationId } = useParams();
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [refreshedReservation, setRefreshedReservation] = useState<MyReservation>();
    const [detailRepeatRounds, setDetailRepeatRounds] = useState<RepeatRound[]>();
    const [isInitialDetailLoading, setIsInitialDetailLoading] = useState(!!accessToken);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const cancelReservationMutation = useCancelReservation({ accessToken });
    const locationState = location.state as {
        fromReservationApply?: boolean;
        temporaryReservation?: MyReservation;
        temporaryRepeatRounds?: RepeatRound[];
        listViewState?: ReservationListViewState;
    } | null;
    const temporaryReservation = locationState?.temporaryReservation;
    const reservation = refreshedReservation ?? (temporaryReservation &&
        String(temporaryReservation.id) === reservationId
        ? temporaryReservation
        : undefined);
    const now = useMemo(() => new Date(), []);
    const loadReservationDetail = useCallback(async () => {
        const currentReservationNumber = Number(reservationId);

        if (!Number.isInteger(currentReservationNumber)) return;

        const detail = await getReservationByNumber({
            accessToken,
            reservationNumber: currentReservationNumber,
        });

        setRefreshedReservation(mapReservationDetail(detail));
        setDetailRepeatRounds(
            detail.kind === 'repeat' ? mapReservationDetailRounds(detail) : undefined,
        );
    }, [accessToken, reservationId]);
    useEffect(() => {
        if (!accessToken) return;

        void loadReservationDetail()
            .catch(() => {
                // Keep navigation state visible if initial detail loading fails.
            })
            .finally(() => setIsInitialDetailLoading(false));
    }, [accessToken, loadReservationDetail]);
    const handleBack = locationState?.fromReservationApply
        ? () => {
            queryClient.removeQueries({
                queryKey: roomDayQueryKeys.all,
            });
            queryClient.removeQueries({
                queryKey: roomMonthQueryKeys.all,
            });
            navigate('/', {
                replace: true,
                state: {
                    selectedDate: reservation?.startAt.slice(0, 10),
                },
            });
        }
        : locationState?.listViewState
            ? () => navigate('/reservations', {
                state: {
                    listViewState: locationState.listViewState,
                },
            })
            : undefined;
    const handleRefresh = async () => {
        const currentReservationNumber = Number(reservationId);

        if (!Number.isInteger(currentReservationNumber)) return;

        setIsRefreshing(true);

        try {
            await loadReservationDetail();
            await queryClient.invalidateQueries({
                queryKey: reservationQueryKeys.all,
            });
        } catch {
            // Keep the currently visible reservation if a manual refresh fails.
        } finally {
            setIsRefreshing(false);
        }
    };
    const handleCancelRepeatRound = async (round: RepeatRound) => {
        if (!round.reservationNumber || cancelReservationMutation.isPending) return false;

        try {
            await cancelReservationMutation.mutateAsync(round.reservationNumber);
            await loadReservationDetail();
            return true;
        } catch {
            return false;
        }
    };
    const handleReapplyRepeatRound = (round: RepeatRound) => {
        navigate(`/reservation/apply?date=${encodeURIComponent(round.date)}`, {
            state: {
                selectedDate: round.date,
            },
        });
    };
    const cancelError = cancelReservationMutation.error instanceof Error
        ? cancelReservationMutation.error.message
        : null;

    if (!reservation) {
        return (
            <MobilePageLayout
                header={(
                    <PageSubHeader
                        title="예약 상세보기"
                        rightContent={(
                            <PageRefreshButton
                                isRefreshing={isRefreshing}
                                onRefresh={handleRefresh}
                            />
                        )}
                    />
                )}
            >
                <main className="my-reservation-detail-page">
                    <p className="page-empty">
                        {isInitialDetailLoading
                            ? '예약 정보를 불러오는 중이에요.'
                            : '예약 정보를 찾을 수 없어요.'}
                    </p>
                </main>
            </MobilePageLayout>
        );
    }

    if (reservation.isRepeat) {
        return (
            <RepeatReservationDetail
                reservation={reservation}
                initialRepeatRounds={detailRepeatRounds ?? locationState?.temporaryRepeatRounds}
                onBack={handleBack}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                cancelError={cancelError}
                isCancelSubmitting={cancelReservationMutation.isPending}
                onCancelRound={handleCancelRepeatRound}
                onReapplyRound={handleReapplyRepeatRound}
            />
        );
    }

    const progressSteps = getProgressSteps(reservation, now);
    const cancelInfo = getCancelInfo(reservation, now);
    const stateView = getReservationStateView(reservation);

    const handleConfirmCancel = async () => {
        if (cancelReservationMutation.isPending) return;

        try {
            await cancelReservationMutation.mutateAsync(reservation.id);
            navigate('/reservations', {
                state: {
                    ...locationState?.listViewState && {
                        listViewState: locationState.listViewState,
                    },
                    toastMessage: '예약이 취소되었어요.',
                },
            });
        } catch {
            // Mutation error is displayed in the confirmation modal.
        }
    };
    return (
        <DetailShell
            title="예약 상세보기"
            onBack={handleBack}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
        >
            <ReservationSummaryCard
                reservation={reservation}
                stateView={stateView}
            />
            <ProgressSection
                steps={progressSteps}
                fallbackConnectorColor="transparent"
            />
            <CancelInfoSection
                cancelInfo={cancelInfo}
                onCancel={() => {
                    cancelReservationMutation.reset();
                    setIsCancelModalOpen(true);
                }}
            />

            {isCancelModalOpen && (
                <CancelReservationModal
                    reservation={reservation}
                    errorMessage={cancelError}
                    isSubmitting={cancelReservationMutation.isPending}
                    onCancel={() => {
                        cancelReservationMutation.reset();
                        setIsCancelModalOpen(false);
                    }}
                    onConfirm={handleConfirmCancel}
                />
            )}
        </DetailShell>
    );
};

export default MyReservationDetailPage;
