import { useState } from "react";
import BottomHero from "../components/branding/BottomHero";
import CalendarSection from "../components/calendar/CalendarSection";
import MobilePageLayout from "../components/layout/MobilePageLayout";
import PageHeader from "../components/layout/PageHeader";
import ReservationApplyButton from "../components/reservation/ReservationApplyButton";
import TimelineSection from "../components/timeline/TimelineSection";

const ReservationStatusPage = () => {
    const today = new Date();
    const defaultDate = today.toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    return (
        <MobilePageLayout>
            <PageHeader title="예약 현황" />

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