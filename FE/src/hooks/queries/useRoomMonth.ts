import { useQuery } from '@tanstack/react-query';
import { getRoomMonth } from '../../apis/roomApi';
import { DEFAULT_ROOM_ID } from '../../constants/global';
import { ROOM_API_TEXT } from '../../domains/reservation/constants';
import type { CalendarScope, MonthSchedule } from '../../types/calendarTypes';

interface UseRoomMonthParams {
    year?: number;
    month?: number;
    roomId?: number;
    scope?: CalendarScope;
    enabled?: boolean;
}

export const roomMonthQueryKeys = {
    all: ['roomMonth'] as const,
    detail: ({
        roomId,
        year,
        month,
        scope = 'all',
    }: {
        roomId: number;
        year?: number;
        month?: number;
        scope?: CalendarScope;
    }) => [
        'roomMonth',
        roomId,
        year ?? 'currentYear',
        month ?? 'currentMonth',
        scope,
    ] as const,
};

export const useRoomMonth = ({
    year,
    month,
    roomId = DEFAULT_ROOM_ID,
    scope = 'all',
    enabled = true,
}: UseRoomMonthParams = {}) => {
    return useQuery<MonthSchedule, Error>({
        queryKey: roomMonthQueryKeys.detail({ roomId, year, month, scope }),
        queryFn: () => {
            if (!year || !month) {
                throw new Error(ROOM_API_TEXT.monthParamsRequired);
            }

            return getRoomMonth({ roomId, year, month, scope });
        },
        enabled: enabled && !!roomId && !!year && !!month,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
    });
};
