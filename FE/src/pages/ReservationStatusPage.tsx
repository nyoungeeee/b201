import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import CalendarSection from '../components/calendar/CalendarSection';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';
import ReservationApplyButton from '../components/reservation/ReservationApplyButton';
import UpcomingReservationBanner from '../components/reservation/UpcomingReservationBanner';
import TimelineSection from '../components/timeline/TimelineSection';
import { DEFAULT_ROOM_ID } from '../constants/global';
import {
    RESERVATION_COMMON_TEXT,
    RESERVATION_STATUS_TEXT,
} from '../domains/reservation/constants';
import { reservationQueryKeys } from '../hooks/queries/useReservations';
import { roomDayQueryKeys } from '../hooks/queries/useRoomDay';
import { roomMonthQueryKeys } from '../hooks/queries/useRoomMonth';
import { useAuthSession } from '../hooks/useAuthSession';
import { queryClient } from '../lib/queryClient';
import type { CalendarScope } from '../types/calendarTypes';
import { getTodayInSeoul } from '../utils/timelineUtils';

const isValidDateString = (dateString?: string | null): dateString is string => (
    !!dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)
);

const ReservationStatusPage = () => {
    const location = useLocation();
    const locationState = location.state as { selectedDate?: string } | null;
    const today = getTodayInSeoul();
    const { isLoggedIn } = useAuthSession();
    const [selectedDate, setSelectedDate] = useState(
        isValidDateString(locationState?.selectedDate)
            ? locationState.selectedDate
            : today,
    );
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [scope, setScope] = useState<CalendarScope>('all');

    useEffect(() => {
        if (!isLoggedIn) {
            setScope('all');
        }
    }, [isLoggedIn]);

    const handleSelectDate = (date: string) => {
        queryClient.invalidateQueries({
            queryKey: roomDayQueryKeys.detail({
                roomId: DEFAULT_ROOM_ID,
                date,
                scope,
            }),
            exact: true,
        });

        setSelectedDate(date);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);

        try {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: roomDayQueryKeys.detail({
                        roomId: DEFAULT_ROOM_ID,
                        date: selectedDate,
                        scope,
                    }),
                    exact: true,
                }),
                queryClient.invalidateQueries({
                    queryKey: roomMonthQueryKeys.all,
                }),
                queryClient.invalidateQueries({
                    queryKey: reservationQueryKeys.all,
                }),
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <MobilePageLayout
            header={(
                <PageHeader
                    rightContent={isLoggedIn ? (
                        <button
                            type="button"
                            className={[
                                'calendar-scope-toggle',
                                scope === 'mine' ? 'is-mine' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            role="switch"
                            aria-checked={scope === 'mine'}
                            aria-label={RESERVATION_STATUS_TEXT.scopeToggleAriaLabel}
                            onClick={() => setScope((currentScope) => (
                                currentScope === 'all' ? 'mine' : 'all'
                            ))}
                        >
                            <span className="calendar-scope-toggle__label">
                                {scope === 'mine'
                                    ? RESERVATION_COMMON_TEXT.mine
                                    : RESERVATION_COMMON_TEXT.all}
                            </span>
                            <span
                                className="calendar-scope-toggle__track"
                                aria-hidden="true"
                            >
                                <span className="calendar-scope-toggle__thumb" />
                            </span>
                        </button>
                    ) : undefined}
                />
            )}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
        >
            <div className="reservation-status-page">
                <UpcomingReservationBanner />

                <CalendarSection
                    key={selectedDate}
                    selectedDate={selectedDate}
                    scope={scope}
                    onSelectDate={handleSelectDate}
                />

                <TimelineSection date={selectedDate} scope={scope} />

                <BottomHero />
            </div>

            <div className="floating-cta">
                <ReservationApplyButton selectedDate={selectedDate} />
            </div>
        </MobilePageLayout>
    );
};

export default ReservationStatusPage;
