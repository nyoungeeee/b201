import { z } from 'zod';

export const teamRoleSchema = z.enum(['LEADER', 'MEMBER']);

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
    color: hexColorSchema,
});

export type TeamMemberApiResponse = z.infer<typeof teamMemberSchema>;
export type TeamMemberListApiResponse = z.infer<
    typeof teamMemberListResponseSchema
>;
export type TeamConfigApiResponse = z.infer<
    typeof teamConfigResponseSchema
>;
