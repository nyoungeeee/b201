import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelReservation } from '../../apis/reservationApi';
import { reservationQueryKeys } from '../queries/useReservations';

interface ReservationMutationOptions {
    accessToken?: string | null;
}

export const useCancelReservation = ({
    accessToken,
}: ReservationMutationOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reservationNumber: number) => cancelReservation({
            accessToken,
            reservationNumber,
        }),
        onSuccess: () => queryClient.invalidateQueries({
            queryKey: reservationQueryKeys.all,
        }),
    });
};
