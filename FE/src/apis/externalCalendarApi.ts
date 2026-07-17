import { API_BASE_URL } from '../constants/env';
import { externalCalendarSubscriptionResponseSchema } from '../types/externalCalendarSchemas';
import type { ExternalCalendarSubscription } from '../types/externalCalendarTypes';
import { authFetch } from './authFetch';

const EXTERNAL_CALENDAR_API_TEXT = {
    fetchError: (status: number) =>
        `외부 캘린더 구독 URL 조회에 실패했습니다. (status: ${status})`,
    responseError: '외부 캘린더 구독 URL 응답 형식이 올바르지 않습니다.',
} as const;

const buildExternalCalendarUrl = () => `${API_BASE_URL}/me/calendar-subscription/`;

export const getExternalCalendarSubscription = async (): Promise<ExternalCalendarSubscription> => {
    const response = await authFetch(buildExternalCalendarUrl(), {
        method: 'POST',
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
        icsUrl: parsedResult.data.calendar_url,
    };
};
