export type ScheduleState = 'RESERVED' | 'BLOCKED';

export interface DayScheduleSlot {
    startTime: string;
    endTime: string;
    label: string;
    color: string;
}

export interface DaySchedule {
    roomId: number;
    roomName: string;
    date: string;
    openTime: string;
    closeTime: string;
    state: ScheduleState;
    slots: DayScheduleSlot[];
    hasReservation: boolean;
}

export interface RoomDaySlotApi {
    id?: number | string;
    start_time: string; // "09:00"
    end_time: string;   // "11:00"
    team_name?: string;
    user_name?: string;
    title?: string;
    name?: string;
    color?: string;
    team_color?: string;
}

export interface RoomDayApiResponse {
    room_id: number;
    room_name: string;
    date: string;       // "2026-05-23"
    open_time: string;  // "09:00"
    close_time: string; // "08:00"
    state: string;
    slot: RoomDaySlotApi[];
}