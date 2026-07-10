import { API_BASE_URL, USE_EXTERNAL_CALENDAR_MOCK } from '../constants/env';
import { getMockExternalCalendarSubscription } from '../domains/externalCalendar/mock';
import { externalCalendarSubscriptionResponseSchema } from '../types/externalCalendarSchemas';
import type { ExternalCalendarSubscription } from '../types/externalCalendarTypes';
import { authFetch } from './authFetch';

interface GetExternalCalendarSubscriptionParams {
    userId: number;
}

const EXTERNAL_CALENDAR_API_TEXT = {
    fetchError: (status: number) =>
        `외부 캘린더 구독 URL 조회에 실패했습니다. (status: ${status})`,
    responseError: '외부 캘린더 구독 URL 응답 형식이 올바르지 않습니다.',
} as const;

const buildExternalCalendarUrl = () => `${API_BASE_URL}/me/calendar/`;

export const getExternalCalendarSubscription = async ({
    userId,
}: GetExternalCalendarSubscriptionParams): Promise<ExternalCalendarSubscription> => {
    if (USE_EXTERNAL_CALENDAR_MOCK) {
        return getMockExternalCalendarSubscription(userId);
    }

    const response = await authFetch(buildExternalCalendarUrl(), {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(EXTERNAL_CALENDAR_API_TEXT.fetchError(response.status));
    }

    const rawData: unknown = await response.json();
    const parsedResult = externalCalendarSubscriptionResponseSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error(
            'External calendar subscription API validation failed:',
            parsedResult.error.format(),
        );
        throw new Error(EXTERNAL_CALENDAR_API_TEXT.responseError);
    }

    return {
        icsUrl: parsedResult.data.ics_url,
    };
};
