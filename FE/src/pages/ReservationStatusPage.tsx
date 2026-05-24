import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import CalendarSection from '../components/calendar/CalendarSection';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';
import ReservationApplyButton from '../components/reservation/ReservationApplyButton';
import TimelineSection from '../components/timeline/TimelineSection';
import { DEFAULT_ROOM_ID } from '../constants/global';
import { roomDayQueryKeys } from '../hooks/queries/useRoomDay';
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

    return (
        <MobilePageLayout header={<PageHeader />}>
            <div className="reservation-status-page">
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
