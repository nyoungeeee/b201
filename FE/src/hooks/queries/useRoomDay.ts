import { useQuery } from '@tanstack/react-query';
import { getRoomDay } from '../../apis/roomApi';
import { DEFAULT_ROOM_ID } from '../../constants/global';
import type { DaySchedule } from '../../types/calendarTypes';

interface UseRoomDayParams {
    date?: string;
    roomId?: number;
    enabled?: boolean;
}

export const roomDayQueryKeys = {
    all: ['roomDay'] as const,
    detail: ({ roomId, date }: { roomId: number; date?: string }) =>
        ['roomDay', roomId, date ?? 'today'] as const,
};

export const useRoomDay = ({
    date,
    roomId = DEFAULT_ROOM_ID,
    enabled = true,
}: UseRoomDayParams = {}) => {
    return useQuery<DaySchedule, Error>({
        queryKey: roomDayQueryKeys.detail({ roomId, date }),
        queryFn: () => getRoomDay({ roomId, date }),
        enabled: enabled && Number.isFinite(roomId) && roomId > 0,
        staleTime: 1000 * 60 * 5,
    });
};