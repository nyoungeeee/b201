import type {
    RoomDayApiResponse,
    RoomDaySlotApiResponse,
    RoomMonthApiResponse,
} from '../types/calendarSchemas';
import type {
    CalendarDotDisplay,
    DaySchedule,
    DayScheduleSlot,
    MonthSchedule,
} from '../types/calendarTypes';
import { normalizeHexColor } from './colorUtils';

const mapRoomDaySlot = (
    slot: RoomDaySlotApiResponse,
): DayScheduleSlot => {
    const isPending = slot.status === 'PENDING';

    return {
        startTime: slot.start_time,
        endTime: slot.end_time,
        label: slot.name,
        color: normalizeHexColor(slot.color),
        status: slot.status,
        isPending,
    };
};

export const mapRoomDayResponse = (
    response: RoomDayApiResponse,
): DaySchedule => {
    const visibleSlots = response.slot.filter(
        (slot) => (
            slot.status === 'PENDING' ||
            slot.status === 'RESERVED' ||
            slot.status === null
        ),
    );

    const slots = visibleSlots.map(mapRoomDaySlot);

    return {
        roomId: response.room_id,
        roomName: response.room_name,
        date: response.date,
        openTime: response.open_time,
        closeTime: response.close_time,
        status: response.status,
        slots,
    };
};

export const mapCalendarDotDisplay = (colors: string[]): CalendarDotDisplay => {
    const uniqueColors = Array.from(new Set(colors));

    if (uniqueColors.length <= 4) {
        return {
            visibleColors: uniqueColors,
            extraCount: 0,
        };
    }

    return {
        visibleColors: uniqueColors.slice(0, 3),
        extraCount: uniqueColors.length - 3,
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
        days: response.days.map((day) => {
            const normalizedColors = (day.color ?? []).map(normalizeHexColor);

            return {
                date: day.date,
                colors: normalizedColors,
                dotDisplay: mapCalendarDotDisplay(normalizedColors),
                disabled: day.disabled,
                isHoliday: day.is_holiday,
            };
        }),
    };
};
