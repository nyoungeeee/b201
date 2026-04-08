import { useMemo, useState } from 'react';
import { useRoomMonth } from '../../hooks/queries/useRoomMonth';
import { queryClient } from '../../lib/queryClient';
import type { MonthSchedule } from '../../types/calendarTypes';

const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarGridDay {
    fullDate: string;
    date: number;
    isCurrentMonth: boolean;
    isSunday: boolean;
    isSaturday: boolean;
    isSelected: boolean;
    visibleColors: string[];
    extraCount: number;
}

interface CalendarSectionProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

const formatMonthTitle = (year: number, month: number) => {
    return `${year}.${String(month).padStart(2, '0')}`;
};

const formatDateString = (year: number, month: number, date: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
};

const getCalendarDays = (
    year: number,
    month: number,
    selectedDate: string,
    monthDays: Array<{
        date: string;
        dotDisplay: {
            visibleColors: string[];
            extraCount: number;
        };
    }>,
): CalendarGridDay[] => {
    const firstDay = new Date(year, month - 1, 1);
    const firstDayWeek = firstDay.getDay();
    const lastDate = new Date(year, month, 0).getDate();
    const prevMonthLastDate = new Date(year, month - 1, 0).getDate();

    const dayMap = new Map(
        monthDays.map((day) => [
            day.date,
            {
                visibleColors: day.dotDisplay.visibleColors,
                extraCount: day.dotDisplay.extraCount,
            },
        ]),
    );

    const days: CalendarGridDay[] = [];

    for (let i = firstDayWeek - 1; i >= 0; i -= 1) {
        const date = prevMonthLastDate - i;
        const prevMonthDate = new Date(year, month - 2, date);
        const fullDate = formatDateString(
            prevMonthDate.getFullYear(),
            prevMonthDate.getMonth() + 1,
            prevMonthDate.getDate(),
        );

        days.push({
            fullDate,
            date,
            isCurrentMonth: false,
            isSunday: days.length % 7 === 0,
            isSaturday: days.length % 7 === 6,
            isSelected: fullDate === selectedDate,
            visibleColors: [],
            extraCount: 0,
        });
    }

    for (let date = 1; date <= lastDate; date += 1) {
        const fullDate = formatDateString(year, month, date);
        const dotInfo = dayMap.get(fullDate);

        days.push({
            fullDate,
            date,
            isCurrentMonth: true,
            isSunday: days.length % 7 === 0,
            isSaturday: days.length % 7 === 6,
            isSelected: fullDate === selectedDate,
            visibleColors: dotInfo?.visibleColors ?? [],
            extraCount: dotInfo?.extraCount ?? 0,
        });
    }
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;

    for (let date = 1; date <= remaining; date += 1) {
        const nextMonthDate = new Date(year, month, date);
        const fullDate = formatDateString(
            nextMonthDate.getFullYear(),
            nextMonthDate.getMonth() + 1,
            nextMonthDate.getDate(),
        );

        days.push({
            fullDate,
            date,
            isCurrentMonth: false,
            isSunday: days.length % 7 === 0,
            isSaturday: days.length % 7 === 6,
            isSelected: fullDate === selectedDate,
            visibleColors: [],
            extraCount: 0,
        });
    }

    return days;
};

const CalendarSection = ({
    selectedDate,
    onSelectDate,
}: CalendarSectionProps) => {

    const initialDate = new Date(selectedDate);
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() + 1);

    const { data, isLoading, isError } = useRoomMonth({
        roomId: 1,
        year: currentYear,
        month: currentMonth,
    });

    const calendarDays = useMemo(() => {
        if (!data) {
            return [];
        }

        return getCalendarDays(currentYear, currentMonth, selectedDate, data.days);
    }, [currentYear, currentMonth, selectedDate, data]);

    const getSelectedDateByGridPosition = (
        targetYear: number,
        targetMonth: number,
        sourceDays: CalendarGridDay[],
        sourceSelectedDate: string,
        targetMonthDays: Array<{
            date: string;
            dotDisplay: {
                visibleColors: string[];
                extraCount: number;
            };
        }>,
    ) => {
        const selectedIndex = sourceDays.findIndex(
            (day) => day.fullDate === sourceSelectedDate,
        );

        if (selectedIndex < 0) {
            return formatDateString(targetYear, targetMonth, 1);
        }

        const targetDays = getCalendarDays(
            targetYear,
            targetMonth,
            '',
            targetMonthDays,
        );

        for (let index = selectedIndex; index >= 0; index -= 7) {
            const targetDay = targetDays[index];

            if (targetDay && targetDay.isCurrentMonth) {
                return targetDay.fullDate;
            }
        }

        const fallbackDay = targetDays.find((day) => day.isCurrentMonth);
        return fallbackDay?.fullDate ?? formatDateString(targetYear, targetMonth, 1);
    };

    const handleMoveMonth = (direction: -1 | 1) => {
        const movedDate = new Date(currentYear, currentMonth - 1 + direction, 1);
        const nextYear = movedDate.getFullYear();
        const nextMonth = movedDate.getMonth() + 1;

        const nextMonthQueryData = queryClient.getQueryData<MonthSchedule>([
            'roomMonth',
            1,
            nextYear,
            nextMonth,
        ]);

        const nextSelectedDate = getSelectedDateByGridPosition(
            nextYear,
            nextMonth,
            calendarDays,
            selectedDate,
            nextMonthQueryData?.days ?? [],
        );

        setCurrentYear(nextYear);
        setCurrentMonth(nextMonth);
        onSelectDate(nextSelectedDate);
    };

    const handlePrevMonth = () => {
        handleMoveMonth(-1);
    };

    const handleNextMonth = () => {
        handleMoveMonth(1);
    };


    const handleSelectDay = (fullDate: string, isCurrentMonth: boolean) => {
        onSelectDate(fullDate);

        if (!isCurrentMonth) {
            const nextDate = new Date(fullDate);
            setCurrentYear(nextDate.getFullYear());
            setCurrentMonth(nextDate.getMonth() + 1);
        }
    };

    if (isLoading) {
        return <section className="calendar-section">로딩 중...</section>;
    }

    if (isError || !data) {
        return <section className="calendar-section">캘린더 데이터를 불러오지 못했습니다.</section>;
    }

    return (
        <section className="calendar-section">
            <div className="calendar-month-header">
                <button
                    type="button"
                    className="calendar-month-header__button"
                    onClick={handlePrevMonth}
                    aria-label="이전 달"
                >
                    ◀
                </button>

                <div className="calendar-month-header__title">
                    {formatMonthTitle(currentYear, currentMonth)}
                </div>

                <button
                    type="button"
                    className="calendar-month-header__button"
                    onClick={handleNextMonth}
                    aria-label="다음 달"
                >
                    ▶
                </button>
            </div>

            <div className="calendar-weekdays">
                {weekLabels.map((label, index) => (
                    <div
                        key={label}
                        className={[
                            'calendar-weekdays__item',
                            index === 0 ? 'calendar-weekdays__item--sun' : '',
                            index === 6 ? 'calendar-weekdays__item--sat' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="calendar-section-divider" />

            <div className="calendar-grid">
                {calendarDays.map((day) => (
                    <button
                        key={day.fullDate}
                        type="button"
                        className={[
                            'calendar-day',
                            !day.isCurrentMonth ? 'calendar-day--adjacent' : '',
                            day.isSunday ? 'calendar-day--sun' : '',
                            day.isSaturday ? 'calendar-day--sat' : '',
                            day.isSelected ? 'calendar-day--selected' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        onClick={() => handleSelectDay(day.fullDate, day.isCurrentMonth)}
                    >
                        <span className="calendar-day__label">{day.date}</span>

                        <span className="calendar-day__dots">
                            {day.visibleColors.map((dotColor, dotIndex) => (
                                <span
                                    key={`${day.fullDate}-dot-${dotIndex}`}
                                    className="calendar-day__dot"
                                    style={{ backgroundColor: `#${dotColor}` }}
                                />
                            ))}

                            {day.extraCount > 0 && (
                                <span className="calendar-day__dot-count">
                                    +{day.extraCount}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
};



export default CalendarSection;