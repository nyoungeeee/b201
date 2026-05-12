import { z } from 'zod';

import { TEAM_ROLE_VALUES } from './team';

export const teamRoleSchema = z.enum(TEAM_ROLE_VALUES);

const hexColorSchema = z
    .string()
    .regex(/^#?[0-9A-Fa-f]{6}$/);

export const teamMemberSchema = z.object({
    id: z.number(),
    nickname: z.string().nullable().transform((value) => value ?? ''),
    role: teamRoleSchema,
});

export const teamMemberListResponseSchema = z.object({
    members: z.array(teamMemberSchema),
});

export const teamConfigResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    color_id: z.number().nullable().optional(),
    color: hexColorSchema,
});

export const teamDetailResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    color_id: z.number().nullable().optional(),
    color: hexColorSchema,
    members: z.array(teamMemberSchema),
    is_leader: z.boolean(),
});

export const teamColorSchema = z.object({
    id: z.number(),
    color: hexColorSchema,
    available: z.boolean(),
});

export const teamColorListResponseSchema = z.object({
    colors: z.array(teamColorSchema),
});

export type TeamMemberApiResponse = z.infer<typeof teamMemberSchema>;
export type TeamMemberListApiResponse = z.infer<
    typeof teamMemberListResponseSchema
>;
export type TeamConfigApiResponse = z.infer<
    typeof teamConfigResponseSchema
>;
export type TeamDetailApiResponse = z.infer<
    typeof teamDetailResponseSchema
>;
export type TeamColorApiResponse = z.infer<typeof teamColorSchema>;
export type TeamColorListApiResponse = z.infer<
    typeof teamColorListResponseSchema
>;
