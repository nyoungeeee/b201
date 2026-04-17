import { useQuery } from '@tanstack/react-query';
import { getRoomMonth } from '../../apis/roomApi';
import { DEFAULT_ROOM_ID } from '../../constants/global';
import type { MonthSchedule } from '../../types/calendarTypes';

interface UseRoomMonthParams {
    year?: number;
    month?: number;
    roomId?: number;
    enabled?: boolean;
}

export const roomMonthQueryKeys = {
    all: ['roomMonth'] as const,
    detail: ({
        roomId,
        year,
        month,
    }: {
        roomId: number;
        year?: number;
        month?: number;
    }) => ['roomMonth', roomId, year ?? 'currentYear', month ?? 'currentMonth'] as const,
};

export const useRoomMonth = ({
    year,
    month,
    roomId = DEFAULT_ROOM_ID,
    enabled = true,
}: UseRoomMonthParams = {}) => {
    return useQuery<MonthSchedule, Error>({
        queryKey: roomMonthQueryKeys.detail({ roomId, year, month }),
        queryFn: () => {
            if (!year || !month) {
                throw new Error('year와 month는 필수입니다.');
            }

            return getRoomMonth({ roomId, year, month });
        },
        enabled: enabled && !!roomId && !!year && !!month,
        staleTime: 1000 * 60 * 5,
    });
};