import { z } from 'zod';

export const externalCalendarSubscriptionResponseSchema = z.object({
    ics_url: z.string().url(),
});

export type ExternalCalendarSubscriptionApiResponse = z.infer<
    typeof externalCalendarSubscriptionResponseSchema
>;
