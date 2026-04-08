import type {
    RoomDayApiResponse,
    RoomDaySlotApiResponse,
    RoomMonthApiResponse
} from '../types/calendarSchemas';
import type {
    CalendarDotDisplay,
    DaySchedule,
    DayScheduleSlot,
    MonthSchedule
} from '../types/calendarTypes';

const normalizeHexColor = (color: string): string => {
    if (!color) return '#000000';
    return color.startsWith('#') ? color : `#${color}`;
};

const mapRoomDaySlot = (
    slot: RoomDaySlotApiResponse,
): DayScheduleSlot => ({
    startTime: slot.start_time,
    endTime: slot.end_time,
    label: slot.name,
    color: normalizeHexColor(slot.color),
});

export const mapRoomDayResponse = (
    response: RoomDayApiResponse,
): DaySchedule => {
    const slots = (response.slot ?? []).map(mapRoomDaySlot);

    return {
        roomId: response.room_id,
        roomName: response.room_name,
        date: response.date,
        openTime: response.open_time,
        closeTime: response.close_time,
        state: response.state,
        slots,
        hasReservation: slots.length > 0,
    };
};

export const mapCalendarDotDisplay = (colors: string[]): CalendarDotDisplay => {
    if (colors.length <= 4) {
        return {
            visibleColors: colors,
            extraCount: 0,
        };
    }

    return {
        visibleColors: colors.slice(0, 3),
        extraCount: colors.length - 3,
    };
};

export const mapRoomMonthResponse = (
    response: RoomMonthApiResponse,
): MonthSchedule => {
    return {
        roomId: response.room_id,
        roomName: response.room_name,
        year: response.year,
        month: response.month,
        days: response.days.map((day) => ({
            date: day.date,
            colors: day.colors,
            dotDisplay: mapCalendarDotDisplay(day.colors),
        })),
    };
};