import { useQuery } from '@tanstack/react-query';
import { getRoomDay } from '../../apis/roomApi';
import { DEFAULT_ROOM_ID } from '../../constants/global';
import type { CalendarScope, DaySchedule } from '../../types/calendarTypes';
import { getTodayInSeoul } from '../../utils/timelineUtils';


interface UseRoomDayParams {
    date?: string;
    roomId?: number;
    scope?: CalendarScope;
    enabled?: boolean;
}

const today = getTodayInSeoul();

export const roomDayQueryKeys = {
    all: ['roomDay'] as const,
    detail: ({
        roomId,
        date,
        scope = 'all',
    }: {
        roomId: number;
        date?: string;
        scope?: CalendarScope;
    }) => ['roomDay', roomId, date ?? today, scope] as const,
};

export const useRoomDay = ({
    date,
    roomId = DEFAULT_ROOM_ID,
    scope = 'all',
    enabled = true,
}: UseRoomDayParams = {}) => {
    return useQuery<DaySchedule, Error>({
        queryKey: roomDayQueryKeys.detail({ roomId, date, scope }),
        queryFn: () => getRoomDay({ roomId, date, scope }),
        enabled: enabled && Number.isFinite(roomId) && roomId > 0,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
    });
};
