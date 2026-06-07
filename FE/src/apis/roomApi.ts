import {
    roomDayResponseSchema,
    roomMonthResponseSchema,
} from '../types/calendarSchemas';
import { ROOM_API_TEXT } from '../domains/reservation/constants';
import type {
    CalendarScope,
    DaySchedule,
    MonthSchedule,
} from '../types/calendarTypes';
import {
    mapRoomDayResponse,
    mapRoomMonthResponse,
} from '../utils/calendarMapper';
import { authFetch } from './authFetch';

export interface GetRoomDayParams {
    roomId: number;
    date?: string;
    scope?: CalendarScope;
}

export interface GetRoomMonthParams {
    roomId: number;
    year: number;
    month: number;
    scope?: CalendarScope;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const buildRoomDayUrl = ({ roomId, date, scope }: GetRoomDayParams): string => {
    const baseUrl = `${API_BASE_URL}/rooms/${roomId}/day/`;
    const searchParams = new URLSearchParams();

    if (date) searchParams.set('date', date);
    if (scope === 'mine') searchParams.set('scope', scope);

    const queryString = searchParams.toString();

    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

const buildRoomMonthUrl = ({
    roomId,
    year,
    month,
    scope,
}: GetRoomMonthParams): string => {
    const baseUrl = `${API_BASE_URL}/rooms/${roomId}/month/`;

    const searchParams = new URLSearchParams({
        year: String(year),
        month: String(month),
    });
    if (scope === 'mine') searchParams.set('scope', scope);

    return `${baseUrl}?${searchParams.toString()}`;
};

export const getRoomDay = async ({
    roomId,
    date,
    scope = 'all',
}: GetRoomDayParams): Promise<DaySchedule> => {
    const response = await authFetch(buildRoomDayUrl({ roomId, date, scope }), {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(ROOM_API_TEXT.dayFetchError(response.status));
    }

    const rawData: unknown = await response.json();

    const parsedResult = roomDayResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'RoomDay API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(ROOM_API_TEXT.dayResponseError);
    }

    return mapRoomDayResponse(parsedResult.data);
};

export const getRoomMonth = async ({
    roomId,
    year,
    month,
    scope = 'all',
}: GetRoomMonthParams): Promise<MonthSchedule> => {
    const response = await authFetch(buildRoomMonthUrl({
        roomId,
        year,
        month,
        scope,
    }), {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(ROOM_API_TEXT.monthFetchError(response.status));
    }

    const rawData: unknown = await response.json();

    const parsedResult = roomMonthResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'RoomMonth API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(ROOM_API_TEXT.monthResponseError);
    }

    return mapRoomMonthResponse(parsedResult.data);
};
