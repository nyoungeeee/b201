export const formatDateString = (year: number, month: number, date: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
};

export const formatDateFromDate = (date: Date) => {
    return formatDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

export const parseDateString = (dateString: string) => {
    const [year, month, date] = dateString.split('-').map(Number);

    return { year, month, date };
};

const getDateTimeValue = (dateString: string) => {
    const { year, month, date } = parseDateString(dateString);

    return Date.UTC(year, month - 1, date);
};

export const getDateDistance = (fromDate: string, toDate: string) => {
    return Math.round(
        (getDateTimeValue(toDate) - getDateTimeValue(fromDate)) / 86_400_000,
    );
};

export const addDays = (dateString: string, days: number) => {
    const { year, month, date } = parseDateString(dateString);
    const nextDate = new Date(year, month - 1, date + days);

    return formatDateString(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
    );
};

export const normalizeTimeString = (time: string) => (
    time.length === 5 ? `${time}:00` : time
);

export const createDateTimeString = (date: string, time: string) => (
    `${date}T${normalizeTimeString(time)}`
);

export const parseTimeToMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);

    return hour * 60 + minute;
};

export const isValidDateString = (dateString?: string | null): dateString is string => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;

    const { year, month, date } = parseDateString(dateString);
    const parsedDate = new Date(year, month - 1, date);

    return (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() + 1 === month &&
        parsedDate.getDate() === date
    );
};
