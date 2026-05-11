import { USED_TEAM_COLORS } from './constants';

export const TEAM_COLOR_OPTIONS = [
    'var(--team-01)',
    'var(--team-02)',
    'var(--team-03)',
    'var(--team-04)',
    'var(--team-05)',
    'var(--team-06)',
    'var(--team-07)',
    'var(--team-08)',
    'var(--team-09)',
    'var(--team-10)',
    'var(--team-11)',
    'var(--team-12)',
    'var(--team-13)',
    'var(--team-14)',
    'var(--team-15)',
    'var(--team-16)',
] as const;

const TEAM_COLOR_MAP: Record<string, string> = {
    '#ff6a2a': 'var(--team-01)',
    '#ff3b3b': 'var(--team-02)',
    '#ffd60a': 'var(--team-03)',
    '#a7f432': 'var(--team-04)',
    '#06d6a0': 'var(--team-05)',
    '#00e5ff': 'var(--team-06)',
    '#4cc9f0': 'var(--team-07)',
    '#4361ee': 'var(--team-08)',
    '#3a0ca3': 'var(--team-09)',
    '#7209b7': 'var(--team-10)',
    '#b5179e': 'var(--team-11)',
    '#f72585': 'var(--team-12)',
    '#f9844a': 'var(--team-13)',
    '#90be6d': 'var(--team-14)',
    '#577590': 'var(--team-15)',
    '#e76f51': 'var(--team-16)',
};

const TEAM_COLOR_HEX_MAP: Record<string, string> =
    Object.fromEntries(
        Object.entries(TEAM_COLOR_MAP).map(([hex, cssVar]) => [
            cssVar,
            hex,
        ]),
    );

const normalizeHexColor = (color: string) => {
    const trimmedColor = color.trim();

    if (/^[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
        return `#${trimmedColor.toLowerCase()}`;
    }

    return trimmedColor.toLowerCase();
};

export const isUsedTeamColor = (color: string) =>
    USED_TEAM_COLORS.includes(
        color as (typeof USED_TEAM_COLORS)[number],
    );

export const toTeamColorVar = (color: string) => {
    const normalized = normalizeHexColor(color);

    return TEAM_COLOR_MAP[normalized] ?? color;
};

export const toTeamColorHex = (color: string) => {
    const normalized = normalizeHexColor(color);

    return (
        TEAM_COLOR_HEX_MAP[color] ??
        TEAM_COLOR_HEX_MAP[normalized] ??
        normalized
    ).replace('#', '');
};
