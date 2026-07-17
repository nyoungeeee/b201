import { z } from 'zod';

export const externalCalendarSubscriptionResponseSchema = z.object({
    calendar_url: z.string().url(),
});

export type ExternalCalendarSubscriptionApiResponse = z.infer<
    typeof externalCalendarSubscriptionResponseSchema
>;
