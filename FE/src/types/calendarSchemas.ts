import { z } from 'zod';

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD 이어야 합니다.');

const timeStringSchema = z
    .string()
    .regex(
        /^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/,
        '시간 형식은 HH:mm 이어야 하며 24시는 24:00만 가능합니다.',
    );

const hexColorSchema = z
    .string()
    .regex(/^([0-9A-Fa-f]{6})$/, '색상은 6자리 HEX 문자열이어야 합니다.');

export const roomDayStateSchema = z.enum(['RESERVED', 'BLOCKED']);

export const roomDaySlotSchema = z.object({
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    name: z.string().min(1),
    color: hexColorSchema,
});

export const roomDayResponseSchema = z.object({
    room_id: z.number(),
    room_name: z.string(),
    date: dateStringSchema,
    open_time: timeStringSchema,
    close_time: timeStringSchema,
    state: roomDayStateSchema,
    slot: z.array(roomDaySlotSchema).nullable(),
});

export type RoomDayState = z.infer<typeof roomDayStateSchema>;
export type RoomDaySlotApiResponse = z.infer<typeof roomDaySlotSchema>;
export type RoomDayApiResponse = z.infer<typeof roomDayResponseSchema>;