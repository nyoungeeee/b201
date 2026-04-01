import { calendarDays } from "../../utils/calendarMock";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];

const CalendarSection = () => {
    return (
        <section className="calendar-section">
            <div className="calendar-month-header">
                <button type="button" className="calendar-month-header__button">
                    ◀
                </button>

                <div className="calendar-month-header__title">2025.05</div>

                <button type="button" className="calendar-month-header__button">
                    ▶
                </button>
            </div>

            <div className="calendar-weekdays">
                {weekLabels.map((label, index) => (
                    <div
                        key={label}
                        className={[
                            "calendar-weekdays__item",
                            index === 0 ? "calendar-weekdays__item--sun" : "",
                            index === 6 ? "calendar-weekdays__item--sat" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="calendar-section-divider" />

            <div className="calendar-grid">
                {calendarDays.map((day, index) => (
                    <button
                        key={`${day.date}-${index}`}
                        type="button"
                        className={[
                            "calendar-day",
                            !day.isCurrentMonth ? "calendar-day--adjacent" : "",
                            day.isSunday ? "calendar-day--sun" : "",
                            day.isSaturday ? "calendar-day--sat" : "",
                            day.isSelected ? "calendar-day--selected" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        <span className="calendar-day__label">{day.date}</span>

                        <span className="calendar-day__dots">
                            {day.dots?.map((dotColor, dotIndex) => (
                                <span
                                    key={`${day.date}-dot-${dotIndex}`}
                                    className="calendar-day__dot"
                                    style={{ backgroundColor: dotColor }}
                                />
                            ))}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
};

export default CalendarSection;