import type { ExternalCalendarSubscription } from '../../types/externalCalendarTypes';

export const getMockExternalCalendarSubscription = (
    userId: number,
): ExternalCalendarSubscription => ({
    icsUrl: `https://b201.kr/calendar/ics/mock-user-${userId}.ics`,
});
