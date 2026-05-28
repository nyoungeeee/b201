import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageRefreshButton from '../components/layout/PageRefreshButton';
import PageSubHeader from '../components/layout/PageSubHeader';
import MyReservationCard from '../components/reservation/MyReservationCard';
import { mapReservationListItem } from '../domains/reservation/mapper';
import type {
    MyReservation,
    ReservationListViewState,
    ReservationSort,
    ReservationState,
    ReservationStateFilter,
    ReservationTab,
    ReservationTeamFilter,
} from '../domains/reservation/types';
import {
    reservationQueryKeys,
    useInfiniteReservations,
    useReservations,
} from '../hooks/queries/useReservations';
import { useRefreshAuthUser } from '../hooks/useRefreshAuthUser';
import { useAuthSession } from '../hooks/useAuthSession';
import { queryClient } from '../lib/queryClient';

type ReservationFilterSheet = 'sort' | 'state' | 'team';

const RESERVATION_STATUS_QUERY: Record<ReservationState, 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'> = {
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    canceled: 'CANCELED',
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

const SORT_OPTIONS: Array<{
    label: string;
    value: ReservationSort;
}> = [
    { label: '가까운 날짜 순', value: 'upcoming' },
    { label: '신청일 순', value: 'latest' },
];

const MyReservationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    useRefreshAuthUser();
    const { accessToken, user } = useAuthSession();
    const locationState = location.state as {
        listViewState?: ReservationListViewState;
    } | null;
    const restoredListViewState = locationState?.listViewState;
    const [activeTab, setActiveTab] = useState<ReservationTab>(
        restoredListViewState?.activeTab ?? 'upcoming',
    );
    const [sort, setSort] = useState<ReservationSort>(
        restoredListViewState?.sort ?? 'upcoming',
    );
    const [stateFilter, setStateFilter] = useState<ReservationStateFilter>(
        restoredListViewState?.stateFilter ?? 'all',
    );
    const [teamFilter, setTeamFilter] = useState<ReservationTeamFilter>(
        restoredListViewState?.teamFilter ?? 'all',
    );
    const [draftSort, setDraftSort] = useState<ReservationSort>(
        restoredListViewState?.sort ?? 'upcoming',
    );
    const [draftStateFilter, setDraftStateFilter] =
        useState<ReservationStateFilter>(restoredListViewState?.stateFilter ?? 'all');
    const [draftTeamFilter, setDraftTeamFilter] =
        useState<ReservationTeamFilter>(restoredListViewState?.teamFilter ?? 'all');
    const [activeFilterSheet, setActiveFilterSheet] =
        useState<ReservationFilterSheet | null>(null);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const pageRef = useRef<HTMLElement | null>(null);
    const didRestoreScrollRef = useRef(false);

    const requestedStatus = stateFilter === 'all'
        ? undefined
        : [RESERVATION_STATUS_QUERY[stateFilter]];
    const requestedType = teamFilter === 'personal'
        ? 'private' as const
        : teamFilter.startsWith('team:')
            ? 'team' as const
            : undefined;
    const requestedTeamId = teamFilter.startsWith('team:')
        ? Number(teamFilter.replace('team:', ''))
        : undefined;
    const visibleReservationsQuery = useInfiniteReservations({
        accessToken,
        period: activeTab,
        sort,
        status: requestedStatus,
        type: requestedType,
        teamId: requestedTeamId,
        size: 10,
    });
    const upcomingCountQuery = useReservations({
        accessToken,
        period: 'upcoming',
        size: 1,
    });
    const pastCountQuery = useReservations({
        accessToken,
        period: 'past',
        size: 1,
    });
    const reservations = useMemo(() => (
        visibleReservationsQuery.data?.pages.flatMap((page) => (
            page.reservations.map((reservation) => mapReservationListItem(reservation))
        )) ?? []
    ), [visibleReservationsQuery.data]);

    const handleSelectTab = (tab: ReservationTab) => {
        setActiveTab(tab);
        setSort('upcoming');
        setStateFilter('all');
        setTeamFilter('all');
        setDraftSort('upcoming');
        setDraftStateFilter('all');
        setDraftTeamFilter('all');
        setActiveFilterSheet(null);

        const content = pageRef.current?.closest('.layout-content');
        if (content instanceof HTMLElement) {
            content.scrollTop = 0;
        }

        void queryClient.invalidateQueries({
            queryKey: reservationQueryKeys.infiniteList({
                accessToken,
                period: tab,
                sort: 'upcoming',
                status: undefined,
                type: undefined,
                teamId: undefined,
                size: 10,
            }),
            exact: true,
        });
    };

    const teamFilterOptions = useMemo(() => {
        return [
            { label: '전체', value: 'all' as ReservationTeamFilter },
            { label: '개인 연습', value: 'personal' as ReservationTeamFilter },
            ...(user?.team ?? []).map((team) => ({
                label: team.name,
                value: `team:${team.id}` as ReservationTeamFilter,
            })),
        ];
    }, [user?.team]);

    const upcomingReservationCount = upcomingCountQuery.data?.pagination.total_count ?? 0;
    const pastReservationCount = pastCountQuery.data?.pagination.total_count ?? 0;
    const isReservationsLoading = !!accessToken && visibleReservationsQuery.isPending;
    const isReservationsListLoading = isReservationsLoading || isManualRefreshing;
    const isReservationsError = !accessToken || (
        visibleReservationsQuery.isError && !visibleReservationsQuery.data
    );
    const hasNextPage = visibleReservationsQuery.hasNextPage;
    const isFetchingNextPage = visibleReservationsQuery.isFetchingNextPage;
    const isFetchNextPageError = visibleReservationsQuery.isFetchNextPageError;
    const fetchNextPage = visibleReservationsQuery.fetchNextPage;
    const isRefreshing = (
        visibleReservationsQuery.isRefetching ||
        upcomingCountQuery.isRefetching ||
        pastCountQuery.isRefetching
    );
    const stateFilterLabel = STATE_FILTER_OPTIONS.find(
        (option) => option.value === stateFilter,
    )?.label ?? '예약 상태';
    const sortLabel = SORT_OPTIONS.find(
        (option) => option.value === sort,
    )?.label ?? '가까운 날짜 순';
    const teamFilterLabel = teamFilterOptions.find(
        (option) => option.value === teamFilter,
    )?.label ?? '전체';
    const getListViewState = (): ReservationListViewState => ({
        activeTab,
        sort,
        stateFilter,
        teamFilter,
        scrollTop: pageRef.current?.closest('.layout-content')?.scrollTop ?? 0,
    });
    const handleSelectReservation = (reservation: MyReservation) => {
        navigate(`/reservations/${reservation.id}`, {
            state: {
                temporaryReservation: reservation,
                listViewState: getListViewState(),
            },
        });
    };
    const handleRefresh = async () => {
        setIsManualRefreshing(true);

        try {
            await Promise.all([
                visibleReservationsQuery.refetch(),
                upcomingCountQuery.refetch(),
                pastCountQuery.refetch(),
            ]);
        } finally {
            setIsManualRefreshing(false);
        }
    };

    useEffect(() => {
        if (
            didRestoreScrollRef.current ||
            isReservationsLoading ||
            typeof restoredListViewState?.scrollTop !== 'number'
        ) {
            return;
        }

        const content = pageRef.current?.closest('.layout-content');
        if (!(content instanceof HTMLElement)) return;

        const animationFrameId = window.requestAnimationFrame(() => {
            content.scrollTop = restoredListViewState.scrollTop ?? 0;
            didRestoreScrollRef.current = true;
        });

        return () => window.cancelAnimationFrame(animationFrameId);
    }, [isReservationsLoading, reservations.length, restoredListViewState?.scrollTop]);

    useEffect(() => {
        const target = loadMoreRef.current;

        if (!target || !hasNextPage || isReservationsListLoading) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isFetchingNextPage && !isFetchNextPageError) {
                    void fetchNextPage();
                }
            },
            { rootMargin: '0px 0px 300px 0px' },
        );

        observer.observe(target);

        return () => observer.disconnect();
    }, [
        fetchNextPage,
        hasNextPage,
        isFetchNextPageError,
        isFetchingNextPage,
        isReservationsListLoading,
    ]);

    const openFilterSheet = (sheet: ReservationFilterSheet) => {
        setDraftSort(sort);
        setDraftStateFilter(stateFilter);
        setDraftTeamFilter(teamFilter);
        setActiveFilterSheet(sheet);
    };

    const closeFilterSheet = () => {
        setActiveFilterSheet(null);
    };

    const applyFilterSheet = () => {
        if (activeFilterSheet === 'sort') {
            setSort(draftSort);
        }

        if (activeFilterSheet === 'state') {
            setStateFilter(draftStateFilter);
        }

        if (activeFilterSheet === 'team') {
            setTeamFilter(draftTeamFilter);
        }

        closeFilterSheet();
    };

    const filterSheetTitle = activeFilterSheet === 'sort'
        ? '정렬 기준'
        : activeFilterSheet === 'state'
            ? '예약 상태'
            : '팀 선택';
    const filterSheetOptions = activeFilterSheet === 'sort'
        ? SORT_OPTIONS
        : activeFilterSheet === 'state'
            ? STATE_FILTER_OPTIONS
            : teamFilterOptions;
    const selectedFilterValue = activeFilterSheet === 'sort'
        ? draftSort
        : activeFilterSheet === 'state'
            ? draftStateFilter
            : draftTeamFilter;

    return (
        <MobilePageLayout
            header={(
                <PageSubHeader
                    title="내 예약 현황"
                    rightContent={(
                        <PageRefreshButton
                            isRefreshing={isRefreshing || isManualRefreshing}
                            onRefresh={handleRefresh}
                        />
                    )}
                />
            )}
        >
            <main ref={pageRef} className="my-reservation-page">
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
                            <span>{upcomingReservationCount}</span>
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
                            <span>{pastReservationCount}</span>
                        </button>
                    </div>

                    <div className="my-reservation-content">
                        <div className="my-reservation-filters" aria-label="예약 필터">
                            <button
                                type="button"
                                className={sort !== 'upcoming' ? 'is-filtered' : ''}
                                onClick={() => openFilterSheet('sort')}
                            >
                                {sortLabel}
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m7 10 5 5 5-5" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                className={[
                                    'my-reservation-filters__state',
                                    stateFilter !== 'all' ? 'is-filtered' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
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
                            key={`${activeTab}-${sort}-${stateFilter}-${teamFilter}`}
                            className="my-reservation-list"
                        >
                            {!isReservationsListLoading && !isReservationsError && reservations.map((reservation, index) => (
                                <MyReservationCard
                                    key={reservation.id}
                                    index={index}
                                    reservation={reservation}
                                    onSelect={handleSelectReservation}
                                />
                            ))}

                            {isReservationsListLoading && (
                                <div className="my-reservation-loading">
                                    <div
                                        className="my-reservation-loading__spinner"
                                        aria-hidden="true"
                                    />
                                    <p className="my-reservation-empty">
                                        내 예약 현황을 가져오고 있어요
                                    </p>
                                </div>
                            )}

                            {isReservationsError && (
                                <p className="my-reservation-empty">
                                    예약 목록을 불러오지 못했어요.
                                </p>
                            )}

                            {!isReservationsListLoading && !isReservationsError && reservations.length === 0 && (
                                <p className="my-reservation-empty">
                                    표시할 예약이 없어요.
                                </p>
                            )}

                            {!isReservationsListLoading && !isReservationsError && hasNextPage && (
                                <div
                                    ref={loadMoreRef}
                                    className="my-reservation-load-more"
                                    aria-label={isFetchingNextPage ? '다음 예약을 불러오는 중' : undefined}
                                >
                                    {isFetchingNextPage && (
                                        <div className="my-reservation-load-more__skeleton" aria-hidden="true">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    )}
                                    {isFetchNextPageError && !isFetchingNextPage && (
                                        <button
                                            type="button"
                                            className="my-reservation-load-more__retry"
                                            onClick={() => void fetchNextPage()}
                                        >
                                            더 불러오지 못했어요. 다시 시도
                                        </button>
                                    )}
                                </div>
                            )}

                            {!isReservationsListLoading && !isReservationsError && reservations.length > 0 && !hasNextPage && (
                                <p className="my-reservation-list__end">
                                    모든 예약 내역을 확인했어요.
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
                                                if (activeFilterSheet === 'sort') {
                                                    setDraftSort(
                                                        option.value as ReservationSort,
                                                    );
                                                    return;
                                                }

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
