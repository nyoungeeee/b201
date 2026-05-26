import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
    getReservations,
    type GetReservationsParams,
    type ReservationListResponse,
} from '../../apis/reservationApi';

interface UseReservationsParams extends GetReservationsParams {
    enabled?: boolean;
}

interface UseInfiniteReservationsParams extends Omit<GetReservationsParams, 'page'> {
    enabled?: boolean;
}

export const reservationQueryKeys = {
    all: ['reservations'] as const,
    list: (params: GetReservationsParams) =>
        [...reservationQueryKeys.all, params] as const,
    infiniteList: (params: Omit<GetReservationsParams, 'page'>) =>
        [...reservationQueryKeys.all, 'infinite', params] as const,
};

export const useReservations = ({
    enabled = true,
    ...params
}: UseReservationsParams) => {
    return useQuery<ReservationListResponse, Error>({
        queryKey: reservationQueryKeys.list(params),
        queryFn: () => getReservations(params),
        enabled: enabled && !!params.accessToken,
        staleTime: 1000 * 30,
    });
};

export const useInfiniteReservations = ({
    enabled = true,
    ...params
}: UseInfiniteReservationsParams) => {
    return useInfiniteQuery({
        queryKey: reservationQueryKeys.infiniteList(params),
        queryFn: ({ pageParam }) => getReservations({
            ...params,
            page: pageParam,
        }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (
            lastPage.pagination.has_next
                ? lastPage.pagination.page + 1
                : undefined
        ),
        enabled: enabled && !!params.accessToken,
        staleTime: 1000 * 30,
    });
};
