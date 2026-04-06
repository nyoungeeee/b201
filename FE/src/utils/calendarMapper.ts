import type {
    RoomDayApiResponse,
    RoomDaySlotApiResponse,
} from '../types/calendarSchemas';
import type {
    DaySchedule,
    DayScheduleSlot,
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