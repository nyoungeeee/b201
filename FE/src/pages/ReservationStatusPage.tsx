import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import CalendarSection from '../components/calendar/CalendarSection';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';
import ReservationApplyButton from '../components/reservation/ReservationApplyButton';
import UpcomingReservationBanner from '../components/reservation/UpcomingReservationBanner';
import TimelineSection from '../components/timeline/TimelineSection';
import { DEFAULT_ROOM_ID } from '../constants/global';
import { reservationQueryKeys } from '../hooks/queries/useReservations';
import { roomDayQueryKeys } from '../hooks/queries/useRoomDay';
import { roomMonthQueryKeys } from '../hooks/queries/useRoomMonth';
import { queryClient } from '../lib/queryClient';
import { getTodayInSeoul } from '../utils/timelineUtils';

const isValidDateString = (dateString?: string | null): dateString is string => (
    !!dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)
);

const ReservationStatusPage = () => {
    const location = useLocation();
    const locationState = location.state as { selectedDate?: string } | null;
    const today = getTodayInSeoul();
    const [selectedDate, setSelectedDate] = useState(
        isValidDateString(locationState?.selectedDate)
            ? locationState.selectedDate
            : today,
    );
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleSelectDate = (date: string) => {
        queryClient.invalidateQueries({
            queryKey: roomDayQueryKeys.detail({
                roomId: DEFAULT_ROOM_ID,
                date,
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
            header={<PageHeader />}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
        >
            <div className="reservation-status-page">
                <UpcomingReservationBanner />

                <CalendarSection
                    key={selectedDate}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                />

                <TimelineSection date={selectedDate} />

                <BottomHero />
            </div>

            <div className="floating-cta">
                <ReservationApplyButton selectedDate={selectedDate} />
            </div>
        </MobilePageLayout>
    );
};

export default ReservationStatusPage;
