import { z } from 'zod';

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD 이어야 합니다.');

const timeStringSchema = z
    .string()
    .regex(
        /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
        '시간 형식은 HH:mm 또는 HH:mm:ss 이어야 합니다.',
    );

const hexColorSchema = z
    .string()
    .regex(/^#?([0-9A-Fa-f]{6})$/, '색상은 6자리 HEX 문자열이어야 합니다.');

export const roomDayStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const reservationStatusSchema = z.enum([
    'PENDING',
    'RESERVED',
    'CANCELED',
    'CANCELLED',
]);

export const roomDaySlotSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    name: z.string(),
    color: hexColorSchema.optional(),
    status: reservationStatusSchema.nullable(),
});

export const roomDayResponseSchema = z.object({
    room_id: z.number(),
    room_name: z.string(),
    date: dateStringSchema,
    open_time: timeStringSchema,
    close_time: timeStringSchema,
    status: roomDayStatusSchema,
    slot: z.array(roomDaySlotSchema).default([]),
});

export const roomMonthDaySchema = z.object({
    date: dateStringSchema,
    color: z.array(hexColorSchema),
    disabled: z.boolean(),
});

export const roomMonthResponseSchema = z.object({
    room_id: z.number(),
    room_name: z.string(),
    year: z.number(),
    month: z.number().min(1).max(12),
    days: z.array(roomMonthDaySchema),
});

export type RoomDayStatus = z.infer<typeof roomDayStatusSchema>;
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export type RoomDaySlotApiResponse = z.infer<typeof roomDaySlotSchema>;
export type RoomDayApiResponse = z.infer<typeof roomDayResponseSchema>;
export type RoomMonthDayApiResponse = z.infer<typeof roomMonthDaySchema>;
export type RoomMonthApiResponse = z.infer<typeof roomMonthResponseSchema>;
