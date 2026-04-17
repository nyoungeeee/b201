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
}

export interface MonthSchedule {
    roomId: number;
    roomName: string;
    year: number;
    month: number;
    days: MonthScheduleDay[];
}