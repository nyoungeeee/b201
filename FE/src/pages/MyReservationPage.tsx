/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import { ChevronRightIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';

export type ReservationState = 'pending' | 'approved' | 'rejected' | 'canceled';
type ReservationTab = 'upcoming' | 'past';
export type ReservationKind = 'personal' | 'team';
type ReservationStateFilter = 'all' | ReservationState;
type ReservationTeamFilter = 'all' | 'personal' | `team:${string}`;
type ReservationFilterSheet = 'state' | 'team';

export interface MyReservation {
    id: number;
    title: string;
    applicant: string;
    appliedAt: string;
    startAt: string;
    endAt: string;
    state: ReservationState;
    kind: ReservationKind;
    isRepeat: boolean;
    canceledAt?: string;
    canceledBy?: string;
    conflictCount?: number;
    repeatEndAt?: string;
    color: string;
    colorRgb?: string;
}

export const MY_RESERVATIONS: MyReservation[] = [
    {
        id: 1,
        title: 'Medicine For Sleep',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-19T15:29:00',
        startAt: '2026-05-23T18:00:00',
        endAt: '2026-05-23T20:00:00',
        repeatEndAt: '2026-08-08T20:00:00',
        state: 'pending',
        kind: 'team',
        isRepeat: true,
        conflictCount: 2,
        color: 'var(--team-05)',
        colorRgb: '6, 214, 160',
    },
    {
        id: 2,
        title: '개인 연습',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-18T01:12:00',
        startAt: '2026-07-28T21:00:00',
        endAt: '2026-07-28T23:00:00',
        state: 'approved',
        kind: 'personal',
        isRepeat: false,
        color: 'var(--person-01)',
    },
    {
        id: 3,
        title: 'Medicine For Sleep',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-19T15:29:00',
        startAt: '2026-05-23T18:00:00',
        endAt: '2026-05-23T20:00:00',
        repeatEndAt: '2026-08-08T20:00:00',
        state: 'rejected',
        kind: 'team',
        isRepeat: true,
        conflictCount: 2,
        color: 'var(--team-05)',
        colorRgb: '6, 214, 160',
    },
    {
        id: 4,
        title: '미세스 레드 애플',
        applicant: '라일락',
        appliedAt: '2026-05-19T15:29:00',
        startAt: '2026-08-28T09:30:00',
        endAt: '2026-08-28T12:00:00',
        state: 'canceled',
        kind: 'team',
        isRepeat: false,
        canceledAt: '2026-05-20T09:12:00',
        canceledBy: '라일락',
        color: 'var(--team-02)',
        colorRgb: '255, 59, 59',
    },
    {
        id: 5,
        title: '소속된 밴드 C',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-20T13:02:00',
        startAt: '2026-06-03T19:00:00',
        endAt: '2026-06-03T21:00:00',
        state: 'approved',
        kind: 'team',
        isRepeat: false,
        color: 'var(--team-01)',
        colorRgb: '255, 106, 42',
    },
    {
        id: 6,
        title: 'Blue Hour',
        applicant: '시나몬',
        appliedAt: '2026-05-21T09:40:00',
        startAt: '2026-06-18T20:30:00',
        endAt: '2026-06-18T22:30:00',
        state: 'pending',
        kind: 'team',
        isRepeat: false,
        color: 'var(--team-06)',
        colorRgb: '0, 229, 255',
    },
    {
        id: 7,
        title: 'Medicine For Sleep',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-22T12:11:00',
        startAt: '2026-05-23T18:00:00',
        endAt: '2026-05-23T20:00:00',
        repeatEndAt: '2026-08-08T20:00:00',
        state: 'approved',
        kind: 'team',
        isRepeat: true,
        conflictCount: 2,
        color: 'var(--team-05)',
        colorRgb: '6, 214, 160',
    },
    {
        id: 8,
        title: '개인 연습',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-23T10:05:00',
        startAt: '2026-08-02T13:00:00',
        endAt: '2026-08-02T15:00:00',
        state: 'pending',
        kind: 'personal',
        isRepeat: false,
        color: 'var(--person-01)',
    },
    {
        id: 9,
        title: 'Late Night Session',
        applicant: '노을',
        appliedAt: '2026-05-23T11:42:00',
        startAt: '2026-08-16T23:00:00',
        endAt: '2026-08-17T01:00:00',
        state: 'approved',
        kind: 'team',
        isRepeat: false,
        color: 'var(--team-10)',
        colorRgb: '114, 9, 183',
    },
    {
        id: 10,
        title: 'Morning Warm Up',
        applicant: '하린',
        appliedAt: '2026-05-23T15:29:00',
        startAt: '2026-10-04T10:00:00',
        endAt: '2026-10-04T12:00:00',
        state: 'rejected',
        kind: 'team',
        isRepeat: false,
        color: 'var(--team-03)',
        colorRgb: '255, 214, 10',
    },
    {
        id: 11,
        title: 'Clean Repeat Check',
        applicant: '닉네임은여덟글자',
        appliedAt: '2026-05-23T16:10:00',
        startAt: '2026-09-05T18:00:00',
        endAt: '2026-09-05T20:00:00',
        repeatEndAt: '2026-11-21T20:00:00',
        state: 'approved',
        kind: 'team',
        isRepeat: true,
        color: 'var(--team-14)',
        colorRgb: '144, 190, 109',
    },
    {
        id: 12,
        title: 'Silver Line',
        applicant: '바닐라',
        appliedAt: '2025-01-02T18:45:00',
        startAt: '2025-02-07T20:00:00',
        endAt: '2025-02-07T22:30:00',
        repeatEndAt: '2025-04-25T22:30:00',
        state: 'approved',
        kind: 'team',
        isRepeat: true,
        color: 'var(--team-06)',
        colorRgb: '0, 229, 255',
    },
];

export const STATE_LABEL: Record<ReservationState, string> = {
    pending: '승인대기',
    approved: '승인',
    rejected: '거절',
    canceled: '취소',
};

export const getReservationStateView = (reservation: MyReservation) => {
    if (
        reservation.state === 'approved' &&
        new Date(reservation.endAt) < new Date()
    ) {
        return {
            label: '이용완료',
            className: 'completed',
        };
    }

    return {
        label: STATE_LABEL[reservation.state],
        className: reservation.state,
    };
};

const STATE_FILTER_OPTIONS: Array<{
    label: string;
    value: ReservationStateFilter;
}> = [
        { label: '전체', value: 'all' },
        { label: '승인대기', value: 'pending' },
        { label: '승인', value: 'approved' },
        { label: '거절', value: 'rejected' },
        { label: '취소', value: 'canceled' },
    ];

const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDate = (date: Date) => (
    `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}(${DAY_LABEL[date.getDay()]})`
);

const formatTime = (date: Date) => (
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
);

export const formatAppliedAt = (value: string) => {
    const date = new Date(value);

    return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const getDurationLabel = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const durationMinutes = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / 60000),
    );
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
    if (hours > 0) return `${hours}시간`;

    return `${minutes}분`;
};

export const getPeriodLabel = (reservation: MyReservation) => {
    const startDateLabel = formatDate(new Date(reservation.startAt));

    if (reservation.isRepeat && reservation.repeatEndAt) {
        return `${startDateLabel} ~ ${formatDate(new Date(reservation.repeatEndAt))}`;
    }

    return startDateLabel;
};

export const getTimeLabel = (reservation: MyReservation) => (
    `${formatTime(new Date(reservation.startAt))} - ${formatTime(new Date(reservation.endAt))}(${getDurationLabel(
        reservation.startAt,
        reservation.endAt,
    )})`
);

export const getCardStyle = (reservation: MyReservation) => {
    if (reservation.kind === 'personal' || !reservation.colorRgb) {
        return undefined;
    }

    return {
        '--reservation-card-team-bg': `rgba(${reservation.colorRgb}, 0.12)`,
    } as CSSProperties;
};

const MyReservationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as {
        canceledReservationId?: number;
    } | null;
    const [activeTab, setActiveTab] = useState<ReservationTab>('upcoming');
    const [stateFilter, setStateFilter] = useState<ReservationStateFilter>('all');
    const [teamFilter, setTeamFilter] = useState<ReservationTeamFilter>('all');
    const [draftStateFilter, setDraftStateFilter] =
        useState<ReservationStateFilter>('all');
    const [draftTeamFilter, setDraftTeamFilter] =
        useState<ReservationTeamFilter>('all');
    const [activeFilterSheet, setActiveFilterSheet] =
        useState<ReservationFilterSheet | null>(null);
    const [canceledReservationIds] = useState(() => (
        typeof locationState?.canceledReservationId === 'number'
            ? [locationState.canceledReservationId]
            : []
    ));
    const [canceledAt] = useState(() => new Date().toISOString());

    const myReservations = useMemo(() => (
        MY_RESERVATIONS.map((reservation) => (
            canceledReservationIds.includes(reservation.id)
                ? {
                    ...reservation,
                    state: 'canceled' as ReservationState,
                    canceledAt,
                    canceledBy: reservation.applicant,
                }
                : reservation
        ))
    ), [canceledAt, canceledReservationIds]);

    const handleSelectTab = (tab: ReservationTab) => {
        setActiveTab(tab);
        setStateFilter('all');
        setTeamFilter('all');
        setDraftStateFilter('all');
        setDraftTeamFilter('all');
        setActiveFilterSheet(null);
    };

    const { upcomingReservations, pastReservations } = useMemo(() => {
        const now = new Date();
        const upcoming = myReservations
            .filter((reservation) => new Date(reservation.endAt) >= now)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        const past = myReservations
            .filter((reservation) => new Date(reservation.endAt) < now)
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

        return {
            upcomingReservations: upcoming,
            pastReservations: past,
        };
    }, [myReservations]);

    const teamFilterOptions = useMemo(() => {
        const teamNames = Array.from(
            new Set(
                myReservations
                    .filter((reservation) => reservation.kind === 'team')
                    .map((reservation) => reservation.title),
            ),
        );

        return [
            { label: '전체', value: 'all' as ReservationTeamFilter },
            { label: '개인 연습', value: 'personal' as ReservationTeamFilter },
            ...teamNames.map((teamName) => ({
                label: teamName,
                value: `team:${teamName}` as ReservationTeamFilter,
            })),
        ];
    }, [myReservations]);

    const tabReservations = activeTab === 'upcoming'
        ? upcomingReservations
        : pastReservations;
    const reservations = tabReservations.filter((reservation) => {
        const matchesState = stateFilter === 'all' || reservation.state === stateFilter;
        const matchesTeam = teamFilter === 'all' ||
            (teamFilter === 'personal' && reservation.kind === 'personal') ||
            (teamFilter.startsWith('team:') &&
                reservation.kind === 'team' &&
                reservation.title === teamFilter.replace('team:', ''));

        return matchesState && matchesTeam;
    });
    const stateFilterLabel = STATE_FILTER_OPTIONS.find(
        (option) => option.value === stateFilter,
    )?.label ?? '예약 상태';
    const teamFilterLabel = teamFilterOptions.find(
        (option) => option.value === teamFilter,
    )?.label ?? '전체';

    const openFilterSheet = (sheet: ReservationFilterSheet) => {
        setDraftStateFilter(stateFilter);
        setDraftTeamFilter(teamFilter);
        setActiveFilterSheet(sheet);
    };

    const closeFilterSheet = () => {
        setActiveFilterSheet(null);
    };

    const applyFilterSheet = () => {
        if (activeFilterSheet === 'state') {
            setStateFilter(draftStateFilter);
        }

        if (activeFilterSheet === 'team') {
            setTeamFilter(draftTeamFilter);
        }

        closeFilterSheet();
    };

    const filterSheetTitle = activeFilterSheet === 'state'
        ? '예약 상태'
        : '팀 선택';
    const filterSheetOptions = activeFilterSheet === 'state'
        ? STATE_FILTER_OPTIONS
        : teamFilterOptions;
    const selectedFilterValue = activeFilterSheet === 'state'
        ? draftStateFilter
        : draftTeamFilter;

    return (
        <MobilePageLayout header={<PageSubHeader title="내 예약 현황" />}>
            <main className="my-reservation-page">
                <section className="my-reservation-panel" aria-label="예약 목록">
                    <div
                        className={[
                            'my-reservation-tabs',
                            `my-reservation-tabs--${activeTab}`,
                        ].join(' ')}
                        aria-label="예약 구분"
                    >
                        <button
                            type="button"
                            className={[
                                'my-reservation-tabs__button',
                                activeTab === 'upcoming' ? 'is-active' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => handleSelectTab('upcoming')}
                        >
                            예정된 예약
                            <span>{upcomingReservations.length}</span>
                        </button>

                        <button
                            type="button"
                            className={[
                                'my-reservation-tabs__button',
                                activeTab === 'past' ? 'is-active' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => handleSelectTab('past')}
                        >
                            지난 예약
                            <span>{pastReservations.length}</span>
                        </button>
                    </div>

                    <div className="my-reservation-content">
                        <div className="my-reservation-filters" aria-label="예약 필터">
                            <button
                                type="button"
                                className={stateFilter !== 'all' ? 'is-filtered' : ''}
                                onClick={() => openFilterSheet('state')}
                            >
                                {stateFilter === 'all' ? '예약 상태' : stateFilterLabel}
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m7 10 5 5 5-5" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                className={teamFilter !== 'all' ? 'is-filtered' : ''}
                                onClick={() => openFilterSheet('team')}
                            >
                                {teamFilter === 'all' ? '팀 선택' : teamFilterLabel}
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m7 10 5 5 5-5" />
                                </svg>
                            </button>
                        </div>

                        <div
                            key={`${activeTab}-${stateFilter}-${teamFilter}`}
                            className="my-reservation-list"
                        >
                            {reservations.map((reservation, index) => (
                                <article
                                    key={reservation.id}
                                    className={[
                                        'my-reservation-card',
                                        'my-reservation-card--clickable',
                                        `my-reservation-card--${reservation.kind}`,
                                    ].join(' ')}
                                    style={{
                                        ...getCardStyle(reservation),
                                        '--reservation-card-index': index,
                                    } as CSSProperties}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate(`/my/reservations/${reservation.id}`)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            navigate(`/my/reservations/${reservation.id}`);
                                        }
                                    }}
                                >
                                    <div className="my-reservation-card__top">
                                        {(() => {
                                            const stateView = getReservationStateView(reservation);

                                            return (
                                                <span
                                                    className={[
                                                        'my-reservation-card__state',
                                                        `my-reservation-card__state--${stateView.className}`,
                                                    ].join(' ')}
                                                >
                                                    {stateView.label}
                                                </span>
                                            );
                                        })()}

                                        <span
                                            className="my-reservation-card__arrow"
                                            aria-hidden="true"
                                        >
                                            <ChevronRightIcon />
                                        </span>
                                    </div>

                                    <div className="my-reservation-card__title-row">
                                        <span
                                            className="my-reservation-card__dot"
                                            style={{ backgroundColor: reservation.color }}
                                        />
                                        <h2>{reservation.title}</h2>
                                        {reservation.isRepeat && (
                                            <span className="my-reservation-card__repeat">
                                                반복 예약
                                            </span>
                                        )}
                                        {reservation.isRepeat && reservation.conflictCount && (
                                            <span className="my-reservation-card__conflict">
                                                충돌 {reservation.conflictCount}건
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
                                        <span>신청일 {formatAppliedAt(reservation.appliedAt)}</span>
                                    </div>
                                </article>
                            ))}

                            {reservations.length === 0 && (
                                <p className="my-reservation-empty">
                                    표시할 예약이 없어요.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <BottomHero />

                {activeFilterSheet && (
                    <div
                        className="my-reservation-bottom-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="my-reservation-filter-title"
                    >
                        <button
                            type="button"
                            className="my-reservation-bottom-sheet__backdrop"
                            aria-label="필터 닫기"
                            onClick={closeFilterSheet}
                        />

                        <section className="my-reservation-bottom-sheet__panel">
                            <div className="my-reservation-bottom-sheet__handle" />

                            <div className="my-reservation-bottom-sheet__header">
                                <h2 id="my-reservation-filter-title">
                                    {filterSheetTitle}
                                </h2>

                                <button
                                    type="button"
                                    onClick={closeFilterSheet}
                                    aria-label="닫기"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M6 6l12 12M18 6 6 18" />
                                    </svg>
                                </button>
                            </div>

                            <div className="my-reservation-bottom-sheet__options">
                                {filterSheetOptions.map((option) => {
                                    const isSelected = selectedFilterValue === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={[
                                                'my-reservation-bottom-sheet__option',
                                                isSelected ? 'is-selected' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            onClick={() => {
                                                if (activeFilterSheet === 'state') {
                                                    setDraftStateFilter(
                                                        option.value as ReservationStateFilter,
                                                    );
                                                    return;
                                                }

                                                setDraftTeamFilter(
                                                    option.value as ReservationTeamFilter,
                                                );
                                            }}
                                        >
                                            <span aria-hidden="true" />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                className="my-reservation-bottom-sheet__apply"
                                onClick={applyFilterSheet}
                            >
                                적용하기
                            </button>
                        </section>
                    </div>
                )}
            </main>
        </MobilePageLayout>
    );
};

export default MyReservationPage;
