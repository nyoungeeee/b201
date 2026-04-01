import {
    timelineHours,
    timelineReservations,
    type TimelineReservation,
} from "../../utils/timelineMock";

const getHourKey = (hourLabel: string) => Number(hourLabel.split(":")[0]);

const getReservationsByHour = (hourLabel: string) => {
    const hourKey = getHourKey(hourLabel);

    return timelineReservations.filter((reservation) => reservation.rowHour === hourKey);
};

const TimelineBar = ({ reservation }: { reservation: TimelineReservation }) => {
    return (
        <div
            className="timeline-bar"
            style={
                {
                    "--team-color": reservation.color,
                    flex: reservation.span ?? 1,
                } as React.CSSProperties
            }
        >
            {reservation.title}
        </div>
    );
};

const TimelineSection = () => {
    return (
        <section className="timeline-section">
            <div className="calendar-section-divider" />
            <div className="timeline-section__date">5월 23일(금)</div>
            <div className="calendar-section-divider" />

            <div className="timeline-list">
                {timelineHours.map((hour) => {
                    const reservations = getReservationsByHour(hour);

                    return (
                        <div key={hour} className="timeline-row">
                            <div className="timeline-row__time">{hour}</div>

                            <div className="timeline-row__track">
                                {reservations.length > 0 ? (
                                    reservations.map((reservation) => (
                                        <TimelineBar
                                            key={reservation.id}
                                            reservation={reservation}
                                        />
                                    ))
                                ) : (
                                    <div className="timeline-row__empty" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default TimelineSection;