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

const unifiedReservationItemSchema = z.object({
    reservation_number: z.number(),
    repeat_group_id: z.string().nullable().optional(),
    room_id: z.number(),
    room_name: z.string(),
    start_date: dateStringSchema,
    start_time: timeStringSchema,
    end_date: dateStringSchema,
    end_time: timeStringSchema,
    kind: z.enum(['single', 'repeat']),
    repeat_count: z.number().nullable().optional(),
    conflict_count: z.number(),
    type: z.enum(['private', 'team']),
    team_id: z.number().nullable().optional(),
    team_name: z.string().nullable().optional(),
    color: z.string(),
    applicant_id: z.number(),
    applicant_name: z.string(),
    status: reservationStatusSchema,
    created_at: z.string(),
});

const reservationOccurrenceDetailSchema = z.object({
    week: z.number().nullable().optional(),
    reservation_number: z.number().nullable().optional(),
    date: dateStringSchema,
    start_time: timeStringSchema,
    end_date: dateStringSchema,
    end_time: timeStringSchema,
    status: z.enum([
        'PENDING',
        'RESERVED',
        'APPROVED',
        'REJECTED',
        'CANCELED',
        'CANCELLED',
        'CONFLICT',
        'REAPPLIED',
    ]),
    approved_at: z.string().nullable().optional(),
    canceled_at: z.string().nullable().optional(),
    canceled_by: z.union([z.string(), z.number()]).nullable().optional(),
    canceled_by_name: z.string().nullable().optional(),
    reason_code: z.string().nullable().optional(),
    can_reapply: z.boolean(),
});

const reservationDetailSchema = unifiedReservationItemSchema.extend({
    memo: z.string().optional(),
    approved_at: z.string().nullable().optional(),
    canceled_at: z.string().nullable().optional(),
    canceled_by: z.union([z.string(), z.number()]).nullable().optional(),
    canceled_by_name: z.string().nullable().optional(),
    repeat: z.object({
        start_date: dateStringSchema,
        end_date: dateStringSchema,
        count: z.number(),
        weekdays: z.array(z.number()).nullable().optional(),
    }).nullable().optional(),
    occurrences: z.array(reservationOccurrenceDetailSchema),
});

const reservationCreateResponseSchema = z.object({
    reservations: z.array(unifiedReservationItemSchema),
    skipped_occurrences: z.array(repeatConflictOccurrenceSchema).nullable().optional(),
});

const unifiedReservationListSchema = z.object({
    period: z.enum(['upcoming', 'past']),
    reservations: z.array(unifiedReservationItemSchema),
    pagination: z.object({
        page: z.number(),
        size: z.number(),
        total_count: z.number(),
        has_next: z.boolean(),
    }),
});

export type RepeatConflictOccurrence = z.infer<typeof repeatConflictOccurrenceSchema>;
export type RepeatCheckResponse = z.infer<typeof repeatCheckResponseSchema>;
export type ReservationCreateResponse = z.infer<typeof reservationCreateResponseSchema>;
export type ReservationListItem = z.infer<typeof unifiedReservationItemSchema>;
export type ReservationListResponse = z.infer<typeof unifiedReservationListSchema>;
export type ReservationDetailResponse = z.infer<typeof reservationDetailSchema>;
export type ReservationOccurrenceDetail = z.infer<typeof reservationOccurrenceDetailSchema>;

export interface CreateReservationParams {
    accessToken?: string | null;
    roomId: number;
    type: 'private' | 'team';
    startDate: string;
    count: number;
    startTime: string;
    endTime: string;
    teamId?: number;
}

export type CheckRepeatReservationParams = CreateReservationParams;

export interface GetReservationsParams {
    accessToken?: string | null;
    period?: 'upcoming' | 'past';
    sort?: 'upcoming' | 'latest';
    kind?: 'single' | 'repeat';
    type?: 'private' | 'team';
    status?: Array<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'>;
    teamId?: number;
    page?: number;
    size?: number;
}

export interface GetReservationByNumberParams {
    accessToken?: string | null;
    reservationNumber: number;
}

export interface CancelReservationParams {
    accessToken?: string | null;
    reservationNumber: number;
}

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
    type,
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
        buildReservationUrl(`${roomId}/repeat-check`),
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
    startDate,
    count,
    startTime,
    endTime,
    teamId,
}: CreateReservationParams): Promise<ReservationCreateResponse> => {
    const response = await fetch(
        buildReservationUrl(`${roomId}`),
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

export const getReservations = async ({
    accessToken,
    period = 'upcoming',
    sort = 'upcoming',
    kind,
    type,
    status,
    teamId,
    page = 1,
    size = 20,
}: GetReservationsParams): Promise<ReservationListResponse> => {
    const searchParams = new URLSearchParams({
        period,
        sort,
        page: String(page),
        size: String(size),
    });

    if (kind) searchParams.set('kind', kind);
    if (type) searchParams.set('type', type);
    if (teamId) searchParams.set('team_id', String(teamId));
    status?.forEach((value) => searchParams.append('status', value));

    const response = await fetch(
        `${buildReservationUrl('')}?${searchParams.toString()}`,
        {
            method: 'GET',
            headers: buildHeaders(accessToken),
        },
    );
    const rawData = await readJson(response);

    if (!response.ok) {
        throw new Error(
            parseErrorMessage(
                rawData,
                `예약 목록 조회에 실패했습니다. (status: ${response.status})`,
            ),
        );
    }

    const parsedResult = unifiedReservationListSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error('Reservation list API validation failed:', parsedResult.error.format());
        throw new Error('예약 목록 응답 형식이 올바르지 않습니다.');
    }

    return parsedResult.data;
};

export const getReservationByNumber = async ({
    accessToken,
    reservationNumber,
}: GetReservationByNumberParams): Promise<ReservationDetailResponse> => {
    const response = await fetch(
        buildReservationUrl(`number/${reservationNumber}`),
        {
            method: 'GET',
            headers: buildHeaders(accessToken),
        },
    );
    const rawData = await readJson(response);

    if (!response.ok) {
        throw new Error(
            parseErrorMessage(
                rawData,
                `예약 상세 조회에 실패했습니다. (status: ${response.status})`,
            ),
        );
    }

    const parsedResult = reservationDetailSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error('Reservation detail API validation failed:', parsedResult.error.format());
        throw new Error('예약 상세 응답 형식이 올바르지 않습니다.');
    }

    return parsedResult.data;
};

export const cancelReservation = async ({
    accessToken,
    reservationNumber,
}: CancelReservationParams): Promise<void> => {
    const response = await fetch(
        buildReservationUrl(`number/${reservationNumber}`),
        {
            method: 'DELETE',
            headers: buildHeaders(accessToken),
        },
    );
    const rawData = await readJson(response);

    if (!response.ok) {
        throw new Error(
            parseErrorMessage(
                rawData,
                `예약 취소에 실패했습니다. (status: ${response.status})`,
            ),
        );
    }
};
