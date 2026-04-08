import { useQuery } from '@tanstack/react-query';
import type { RoomMonthApiResponse } from '../../types/calendarSchemas';
import type { MonthSchedule } from '../../types/calendarTypes';
import { mapRoomMonthResponse } from '../../utils/calendarMapper';
import { roomMonthMock } from '../../utils/roomMock';

interface UseRoomMonthParams {
    roomId?: number;
    year: number;
    month: number;
}

const getRoomMonthFromDummy = async ({
    roomId,
    year,
    month,
}: UseRoomMonthParams): Promise<MonthSchedule> => {
    console.log('getRoomMonth params:', { roomId, year, month });

    const response: RoomMonthApiResponse = roomMonthMock();

    return mapRoomMonthResponse(response);
};

export const useRoomMonth = ({
    roomId,
    year,
    month,
}: UseRoomMonthParams) => {
    return useQuery({
        queryKey: ['roomMonth', roomId, year, month],
        queryFn: () => getRoomMonthFromDummy({ roomId, year, month }),
    });
};