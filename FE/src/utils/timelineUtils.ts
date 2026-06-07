import type { DayScheduleSlot } from '../types/calendarTypes';

export interface TimelineRowSegment {
    id: string;
    rowKey: string;
    title: string;
    color: string;
    startMinute: number;
    endMinute: number;
    isPending: boolean;
}

export interface TimelineHour {
    key: string;
    label: string;
    date: string;
    hour: number;
}

const normalizeTimeString = (time: string): string => {
    const parts = time.trim().split(':');

    if (parts.length === 2) {
        return `${parts[0]}:${parts[1]}:00`;
    }

    if (parts.length === 3) {
        return `${parts[0]}:${parts[1]}:${parts[2]}`;
    }

    throw new Error(`올바르지 않은 시간 형식입니다: ${time}`);
};

const parseTime = (time: string) => {
    const normalized = normalizeTimeString(time);
    const [hour, minute, second] = normalized.split(':').map(Number);

    return { hour, minute, second };
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number) => {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
};

const toDateTime = (date: string, time: string) =>
    new Date(`${date}T${normalizeTimeString(time)}`);

export const getTimelineHours = (
    baseDate: string,
    openTime: string,
    closeTime: string,
): TimelineHour[] => {
    const openHour = parseTime(openTime).hour;
    const closeHour = parseTime(closeTime).hour;

    const result: TimelineHour[] = [];
    const crossesMidnight = openHour >= closeHour;

    if (crossesMidnight) {
        for (let h = openHour; h < 24; h++) {
            result.push({
                key: `${baseDate}-${pad2(h)}`,
                label: `${pad2(h)}:00`,
                date: baseDate,
                hour: h,
            });
        }

        const nextDate = addDays(baseDate, 1);

        for (let h = 0; h < closeHour; h++) {
            result.push({
                key: `${nextDate}-${pad2(h)}`,
                label: `${pad2(h)}:00`,
                date: nextDate,
                hour: h,
            });
        }
    } else {
        for (let h = openHour; h < closeHour; h++) {
            result.push({
                key: `${baseDate}-${pad2(h)}`,
                label: `${pad2(h)}:00`,
                date: baseDate,
                hour: h,
            });
        }
    }

    return result;
};

const resolveSlotDate = (
    baseDate: string,
    openTime: string,
    time: string,
) => {
    const openHour = parseTime(openTime).hour;
    const hour = parseTime(time).hour;

    if (hour < openHour) {
        return addDays(baseDate, 1);
    }

    return baseDate;
};

export const mapSlotsToTimelineSegments = (
    slots: DayScheduleSlot[],
    baseDate: string,
    openTime: string,
): TimelineRowSegment[] => {
    const segments: TimelineRowSegment[] = [];

    slots.forEach((slot, index) => {
        const startDate = resolveSlotDate(baseDate, openTime, slot.startTime);
        const endDate = resolveSlotDate(baseDate, openTime, slot.endTime);

        const start = toDateTime(startDate, slot.startTime);
        const end = toDateTime(endDate, slot.endTime);

        let current = new Date(start);
        const actualEnd = new Date(end);

        if (actualEnd <= current) {
            actualEnd.setDate(actualEnd.getDate() + 1);
        }

        while (current < actualEnd) {
            const rowStart = new Date(current);
            rowStart.setMinutes(0, 0, 0);

            const rowEnd = new Date(rowStart);
            rowEnd.setHours(rowEnd.getHours() + 1);

            const segmentEnd = actualEnd < rowEnd ? actualEnd : rowEnd;

            const rowDate = formatLocalDate(rowStart);
            const rowHour = rowStart.getHours();

            segments.push({
                id: `${slot.label}-${index}-${current.getTime()}`,
                rowKey: `${rowDate}-${pad2(rowHour)}`,
                title: slot.label,
                color: slot.color,
                startMinute: current.getMinutes(),
                endMinute:
                    segmentEnd.getMinutes() === 0 ? 60 : segmentEnd.getMinutes(),
                isPending: slot.isPending,
            });

            current = segmentEnd;
        }
    });

    return segments;
};

export const getSegmentsByHour = (
    segments: TimelineRowSegment[],
    hour: TimelineHour,
) => {
    return segments
        .filter((segment) => segment.rowKey === hour.key)
        .sort((a, b) => a.startMinute - b.startMinute);
};

export const formatTimelineDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);

    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = String(date.getDate());
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });

    return `${month} ${dayNum} · ${weekday}`;
};

export const getTodayInSeoul = () => {
    const now = new Date();

    const seoulDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
    );

    const yyyy = seoulDate.getFullYear();
    const mm = String(seoulDate.getMonth() + 1).padStart(2, '0');
    const dd = String(seoulDate.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}
