export type ScheduleState = 'ACTIVE' | 'INACTIVE';
export type CalendarScope = 'all' | 'mine';

export type SlotReservationStatus =
    | 'PENDING'
    | 'RESERVED'
    | 'CANCELED'
    | 'CANCELLED';

export interface DayScheduleSlot {
    startTime: string;
    endTime: string;
    label: string;
    color: string;
    status: SlotReservationStatus | null;
    isPending: boolean;
}

export interface DaySchedule {
    roomId: number;
    roomName: string;
    date: string;
    openTime: string;
    closeTime: string;
    status: ScheduleState;
    slots: DayScheduleSlot[];
}

export interface CalendarDotDisplay {
    visibleColors: string[];
    extraCount: number;
}

export interface MonthScheduleDay {
    date: string;
    colors: string[];
    dotDisplay: CalendarDotDisplay;
    disabled: boolean;
    isHoliday: boolean;
}

export interface MonthSchedule {
    roomId: number;
    roomName: string;
    year: number;
    month: number;
    days: MonthScheduleDay[];
}
