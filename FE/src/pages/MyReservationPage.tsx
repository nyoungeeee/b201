import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageRefreshButton from '../components/layout/PageRefreshButton';
import PageSubHeader from '../components/layout/PageSubHeader';
import MyReservationCard from '../components/reservation/MyReservationCard';
import {
    getReservationTeamFilterBaseOptions,
    MY_RESERVATION_TEXT,
    RESERVATION_COMMON_TEXT,
    RESERVATION_SORT_OPTIONS,
    RESERVATION_STATE_FILTER_OPTIONS,
    RESERVATION_STATUS_QUERY,
} from '../domains/reservation/constants';
import { mapReservationListItem } from '../domains/reservation/mapper';
import type {
    MyReservation,
    ReservationListViewState,
    ReservationSort,
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

const MyReservationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        isRefreshing: isAuthUserRefreshing,
        refreshAuthUser,
    } = useRefreshAuthUser();
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
            ...getReservationTeamFilterBaseOptions(),
            ...(user?.team ?? []).map((team) => ({
                label: team.name,
                value: `team:${team.id}` as ReservationTeamFilter,
            })),
        ];
    }, [user?.team]);

    const stateFilterOptions = useMemo(() => (
        activeTab === 'upcoming'
            ? RESERVATION_STATE_FILTER_OPTIONS.filter(
                (option) => option.value !== 'canceled',
            )
            : RESERVATION_STATE_FILTER_OPTIONS
    ), [activeTab]);

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
        pastCountQuery.isRefetching ||
        isAuthUserRefreshing
    );
    const stateFilterLabel = stateFilterOptions.find(
        (option) => option.value === stateFilter,
    )?.label ?? MY_RESERVATION_TEXT.stateFilter;
    const sortLabel = RESERVATION_SORT_OPTIONS.find(
        (option) => option.value === sort,
    )?.label ?? RESERVATION_SORT_OPTIONS[0].label;
    const teamFilterLabel = teamFilterOptions.find(
        (option) => option.value === teamFilter,
    )?.label ?? RESERVATION_COMMON_TEXT.all;
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
                refreshAuthUser(),
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
        ? MY_RESERVATION_TEXT.sortFilter
        : activeFilterSheet === 'state'
            ? MY_RESERVATION_TEXT.stateFilter
            : MY_RESERVATION_TEXT.teamFilter;
    const filterSheetOptions = activeFilterSheet === 'sort'
        ? RESERVATION_SORT_OPTIONS
        : activeFilterSheet === 'state'
            ? stateFilterOptions
            : teamFilterOptions;
    const selectedFilterValue = activeFilterSheet === 'sort'
        ? draftSort
        : activeFilterSheet === 'state'
            ? draftStateFilter
            : draftTeamFilter;

    return (
        <MobilePageLayout
            isRefreshing={isRefreshing || isManualRefreshing}
            onRefresh={handleRefresh}
            header={(
                <PageSubHeader
                    title={MY_RESERVATION_TEXT.headerTitle}
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
                <section
                    className="my-reservation-panel"
                    aria-label={MY_RESERVATION_TEXT.listAriaLabel}
                >
                    <div
                        className={[
                            'my-reservation-tabs',
                            `my-reservation-tabs--${activeTab}`,
                        ].join(' ')}
                        aria-label={MY_RESERVATION_TEXT.tabAriaLabel}
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
                            {MY_RESERVATION_TEXT.upcomingTab}
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
                            {MY_RESERVATION_TEXT.pastTab}
                            <span>{pastReservationCount}</span>
                        </button>
                    </div>

                    <div className="my-reservation-content">
                        <div
                            className="my-reservation-filters"
                            aria-label={MY_RESERVATION_TEXT.filterAriaLabel}
                        >
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
                                {stateFilter === 'all'
                                    ? MY_RESERVATION_TEXT.stateFilter
                                    : stateFilterLabel}
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m7 10 5 5 5-5" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                className={teamFilter !== 'all' ? 'is-filtered' : ''}
                                onClick={() => openFilterSheet('team')}
                            >
                                {teamFilter === 'all'
                                    ? MY_RESERVATION_TEXT.teamFilter
                                    : teamFilterLabel}
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
                                        {MY_RESERVATION_TEXT.loading}
                                    </p>
                                </div>
                            )}

                            {isReservationsError && (
                                <p className="my-reservation-empty">
                                    {MY_RESERVATION_TEXT.error}
                                </p>
                            )}

                            {!isReservationsListLoading && !isReservationsError && reservations.length === 0 && (
                                <p className="my-reservation-empty">
                                    {MY_RESERVATION_TEXT.empty}
                                </p>
                            )}

                            {!isReservationsListLoading && !isReservationsError && hasNextPage && (
                                <div
                                    ref={loadMoreRef}
                                    className="my-reservation-load-more"
                                    aria-label={isFetchingNextPage
                                        ? MY_RESERVATION_TEXT.loadingMoreAriaLabel
                                        : undefined}
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
                                            {MY_RESERVATION_TEXT.loadMoreError}
                                        </button>
                                    )}
                                </div>
                            )}

                            {!isReservationsListLoading && !isReservationsError && reservations.length > 0 && !hasNextPage && (
                                <p className="my-reservation-list__end">
                                    {MY_RESERVATION_TEXT.listEnd}
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
                            aria-label={MY_RESERVATION_TEXT.closeFilterAriaLabel}
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
                                    aria-label={MY_RESERVATION_TEXT.closeAriaLabel}
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
                                {MY_RESERVATION_TEXT.applyFilter}
                            </button>
                        </section>
                    </div>
                )}
            </main>
        </MobilePageLayout>
    );
};

export default MyReservationPage;
