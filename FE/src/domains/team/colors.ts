import { USED_TEAM_COLORS } from './constants';

export const isUsedTeamColor = (color: string) =>
    USED_TEAM_COLORS.includes(
        color as (typeof USED_TEAM_COLORS)[number],
    );
