import { useQuery } from '@tanstack/react-query';

import { getExternalCalendarSubscription } from '../../apis/externalCalendarApi';
import type { ExternalCalendarSubscription } from '../../types/externalCalendarTypes';

interface UseExternalCalendarSubscriptionParams {
    userId?: number;
}

export const externalCalendarSubscriptionQueryKeys = {
    all: ['externalCalendarSubscription'] as const,
    detail: (userId: number) =>
        [...externalCalendarSubscriptionQueryKeys.all, userId] as const,
};

export const useExternalCalendarSubscription = ({
    userId,
}: UseExternalCalendarSubscriptionParams = {}) => {
    return useQuery<ExternalCalendarSubscription, Error>({
        queryKey: externalCalendarSubscriptionQueryKeys.detail(userId ?? 0),
        queryFn: getExternalCalendarSubscription,
        enabled: Number.isFinite(userId) && (userId ?? 0) > 0,
        staleTime: 5 * 60 * 1000,
    });
};
