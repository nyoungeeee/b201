import { useState } from "react";
import BottomHero from "../components/branding/BottomHero";
import CalendarSection from "../components/calendar/CalendarSection";
import MobilePageLayout from "../components/layout/MobilePageLayout";
import PageHeader from "../components/layout/PageHeader";
import ReservationApplyButton from "../components/reservation/ReservationApplyButton";
import TimelineSection from "../components/timeline/TimelineSection";
import { getTodayInSeoul } from "../utils/timelineUtils";

const ReservationStatusPage = () => {
    const today = getTodayInSeoul();
    const [selectedDate, setSelectedDate] = useState(today);

    return (
        <MobilePageLayout header={<PageHeader />}>
            <div className="reservation-status-page">
                <CalendarSection
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />

                <TimelineSection date={selectedDate} />

                <BottomHero />
            </div>

            <div className="floating-cta">
                <ReservationApplyButton />
            </div>
        </MobilePageLayout>
    );
};

export default ReservationStatusPage;
