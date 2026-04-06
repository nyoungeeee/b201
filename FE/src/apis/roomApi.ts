import { roomDayResponseSchema } from '../types/calendarSchemas';
import type { DaySchedule } from '../types/calendarTypes';
import { mapRoomDayResponse } from '../utils/calendarMapper';
import { roomDayMock } from '../utils/roomDayMock';

export interface GetRoomDayParams {
    roomId: number;
    date?: string;
}

export const getRoomDayFromMock = async ({
    roomId,
    date,
}: GetRoomDayParams): Promise<DaySchedule> => {
    console.log('getRoomDayFromMock params:', { roomId, date });

    const rawData: unknown = roomDayMock;

    const parsedResult = roomDayResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error('RoomDay mock validation failed:', parsedResult.error.format());
        throw new Error('Mock 데이터 형식이 올바르지 않습니다.');
    }

    return mapRoomDayResponse(parsedResult.data);
};

// const buildRoomDayUrl = ({ roomId, date }: GetRoomDayParams): string => {
//     const baseUrl = `/api/v1/rooms/${roomId}/day`;

//     if (!date) return baseUrl;

//     const searchParams = new URLSearchParams({
//         date,
//     });

//     return `${baseUrl}?${searchParams.toString()}`;
// };

// export const getRoomDay = async ({ roomId, date }: GetRoomDayParams): Promise<DaySchedule> => {
//     const response = await fetch(buildRoomDayUrl({ roomId, date }), {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     });

//     if (!response.ok) {
//         throw new Error(`일정 조회에 실패했습니다. (status: ${response.status})`);
//     }

//     const rawData: unknown = await response.json();

//     const parsedResult = roomDayResponseSchema.safeParse(rawData);

//     if (!parsedResult.success) {
//         console.error('RoomDay API validation failed:', parsedResult.error.format());
//         throw new Error('서버 응답 형식이 올바르지 않습니다.');
//     }

//     return mapRoomDayResponse(parsedResult.data);
// };
