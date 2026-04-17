import {
    roomDayResponseSchema,
    roomMonthResponseSchema,
} from '../types/calendarSchemas';
import type {
    DaySchedule,
    MonthSchedule,
} from '../types/calendarTypes';
import {
    mapRoomDayResponse,
    mapRoomMonthResponse,
} from '../utils/calendarMapper';

export interface GetRoomDayParams {
    roomId: number;
    date?: string;
}

export interface GetRoomMonthParams {
    roomId: number;
    year: number;
    month: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const buildRoomDayUrl = ({ roomId, date }: GetRoomDayParams): string => {
    const baseUrl = `${API_BASE_URL}/rooms/${roomId}/day/`;

    if (!date) return baseUrl;

    const searchParams = new URLSearchParams({
        date,
    });

    return `${baseUrl}?${searchParams.toString()}`;
};

const buildRoomMonthUrl = ({
    roomId,
    year,
    month,
}: GetRoomMonthParams): string => {
    const baseUrl = `${API_BASE_URL}/rooms/${roomId}/month/`;

    const searchParams = new URLSearchParams({
        year: String(year),
        month: String(month),
    });

    return `${baseUrl}?${searchParams.toString()}`;
};

export const getRoomDay = async ({
    roomId,
    date,
}: GetRoomDayParams): Promise<DaySchedule> => {
    const response = await fetch(buildRoomDayUrl({ roomId, date }), {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`일정 조회에 실패했습니다. (status: ${response.status})`);
    }

    const rawData: unknown = await response.json();

    const parsedResult = roomDayResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'RoomDay API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error('일정 응답 형식이 올바르지 않습니다.');
    }

    return mapRoomDayResponse(parsedResult.data);
};

export const getRoomMonth = async ({
    roomId,
    year,
    month,
}: GetRoomMonthParams): Promise<MonthSchedule> => {
    const response = await fetch(buildRoomMonthUrl({ roomId, year, month }), {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`월 일정 조회에 실패했습니다. (status: ${response.status})`);
    }

    const rawData: unknown = await response.json();

    const parsedResult = roomMonthResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'RoomMonth API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error('월 일정 응답 형식이 올바르지 않습니다.');
    }

    return mapRoomMonthResponse(parsedResult.data);
};