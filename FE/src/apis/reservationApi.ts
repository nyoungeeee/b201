import { z } from 'zod';

import { API_BASE_URL } from '../constants/env';

const timeStringSchema = z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/);

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/);

const reservationStatusSchema = z.enum([
    'PENDING',
    'RESERVED',
    'APPROVED',
    'REJECTED',
    'CANCELED',
    'CANCELLED',
]);

const reservationItemSchema = z.object({
    reservation_number: z.number(),
    room_id: z.number(),
    room_name: z.string(),
    date: dateStringSchema,
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    kind: z.string().optional(),
    repeat_count: z.number().nullable().optional(),
    type: z.enum(['PRIVATE', 'TEAM', 'private', 'team']),
    name: z.string(),
    memo: z.string().optional(),
    color: z.string(),
    status: reservationStatusSchema,
    team_id: z.number().optional(),
    team_name: z.string().optional(),
});

const repeatOccurrenceSchema = z.object({
    week: z.number(),
    date: dateStringSchema,
});

export const repeatConflictOccurrenceSchema = repeatOccurrenceSchema.extend({
    code: z.string(),
    message: z.string(),
});

const repeatCheckResponseSchema = z.object({
    available_occurrences: z.array(repeatOccurrenceSchema),
    conflict_occurrences: z.array(repeatConflictOccurrenceSchema),
    code: z.string().optional(),
    message: z.string().optional(),
});

const reservationCreateResponseSchema = z.object({
    reservations: z.array(reservationItemSchema),
    skipped_occurrences: z.array(repeatConflictOccurrenceSchema).nullable().optional(),
});

export type RepeatConflictOccurrence = z.infer<typeof repeatConflictOccurrenceSchema>;
export type RepeatCheckResponse = z.infer<typeof repeatCheckResponseSchema>;
export type ReservationCreateResponse = z.infer<typeof reservationCreateResponseSchema>;

export interface CreateReservationParams {
    accessToken?: string | null;
    roomId: number;
    type: 'private' | 'team';
    repeat: boolean;
    startDate: string;
    count: number;
    startTime: string;
    endTime: string;
    teamId?: number;
}

export type CheckRepeatReservationParams = Omit<CreateReservationParams, 'repeat'>;

const buildReservationUrl = (path: string) =>
    `${API_BASE_URL}/reservations/${path}`;

const buildHeaders = (accessToken?: string | null): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

const buildReservationBody = ({
    type,
    startDate,
    count,
    startTime,
    endTime,
    teamId,
}: Pick<
    CreateReservationParams,
    'type' | 'startDate' | 'count' | 'startTime' | 'endTime' | 'teamId'
>) => ({
    start_date: startDate,
    count,
    start_time: startTime,
    end_time: endTime,
    ...(type === 'team' ? { team_id: teamId } : {}),
});

const readJson = async (response: Response): Promise<unknown> => {
    const text = await response.text();

    if (!text) return null;

    return JSON.parse(text) as unknown;
};

const parseErrorMessage = (rawData: unknown, fallback: string) => {
    if (!rawData || typeof rawData !== 'object') return fallback;

    const data = rawData as { message?: unknown; detail?: unknown; code?: unknown };

    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.code === 'string') return data.code;

    return fallback;
};

export const checkRepeatReservation = async ({
    accessToken,
    roomId,
    type,
    startDate,
    count,
    startTime,
    endTime,
    teamId,
}: CheckRepeatReservationParams): Promise<RepeatCheckResponse> => {
    const response = await fetch(
        buildReservationUrl(`${roomId}/${type}/repeat-check`),
        {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify(
                buildReservationBody({
                    type,
                    startDate,
                    count,
                    startTime,
                    endTime,
                    teamId,
                }),
            ),
        },
    );
    const rawData = await readJson(response);
    const parsedResult = repeatCheckResponseSchema.safeParse(rawData);

    if (parsedResult.success) {
        if (!response.ok && parsedResult.data.available_occurrences.length > 0) {
            return parsedResult.data;
        }

        if (response.ok) {
            return parsedResult.data;
        }
    }

    throw new Error(
        parseErrorMessage(
            rawData,
            `반복 예약 확인에 실패했습니다. (status: ${response.status})`,
        ),
    );
};

export const createReservation = async ({
    accessToken,
    roomId,
    type,
    repeat,
    startDate,
    count,
    startTime,
    endTime,
    teamId,
}: CreateReservationParams): Promise<ReservationCreateResponse> => {
    const response = await fetch(
        buildReservationUrl(`${roomId}/${type}${repeat ? '/repeat' : ''}`),
        {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify(
                buildReservationBody({
                    type,
                    startDate,
                    count,
                    startTime,
                    endTime,
                    teamId,
                }),
            ),
        },
    );
    const rawData = await readJson(response);
    const parsedResult = reservationCreateResponseSchema.safeParse(rawData);

    if (!response.ok) {
        throw new Error(
            parseErrorMessage(
                rawData,
                `예약 신청에 실패했습니다. (status: ${response.status})`,
            ),
        );
    }

    if (!parsedResult.success) {
        console.error('Reservation create API validation failed:', parsedResult.error.format());
        throw new Error('예약 신청 응답 형식이 올바르지 않습니다.');
    }

    return parsedResult.data;
};
