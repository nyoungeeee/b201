// import { useQuery } from '@tanstack/react-query';
// import type { DaySchedule } from '../../types/calendarTypes';

// interface UseRoomDayParams {
//     date?: string;
//     roomId?: number;
//     enabled?: boolean;
// }

// export const roomDayQueryKeys = {
//     all: ['roomDay'] as const,
//     detail: ({ roomId, date }: { roomId: number; date?: string }) =>
//         ['roomDay', roomId, date ?? 'today'] as const,
// };

// export const useRoomDay = ({
//     date,
//     roomId = DEFAULT_ROOM_ID,
//     enabled = true
// }: UseRoomDayParams) => {
//     return useQuery<DaySchedule, Error>({
//         queryKey: roomDayQueryKeys.detail({ roomId, date }),
//         queryFn: () => getRoomDay({ roomId, date }),
//         enabled,
//     });
// };

import { useQuery } from '@tanstack/react-query';
import { getRoomDayFromMock } from '../../apis/roomApi';
import type { DaySchedule } from '../../types/calendarTypes';

export const DEFAULT_ROOM_ID = 1;

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
        queryFn: () => getRoomDayFromMock({ roomId, date }),
        enabled,
    });
};