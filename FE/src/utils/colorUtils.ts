import { PRIVATE_DEFAULT_COLOR } from '../constants/global';

export const normalizeHexColor = (color?: string): string => {
    if (!color || !color.trim()) return PRIVATE_DEFAULT_COLOR;

    const trimmedColor = color.trim();

    if (/^#[0-9a-fA-F]{6}$/.test(trimmedColor)) return trimmedColor;
    if (/^[0-9a-fA-F]{6}$/.test(trimmedColor)) return `#${trimmedColor}`;

    return trimmedColor;
};

export const getColorRgb = (color: string) => {
    const normalizedColor = normalizeHexColor(color);

    if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) return undefined;

    const red = parseInt(normalizedColor.slice(1, 3), 16);
    const green = parseInt(normalizedColor.slice(3, 5), 16);
    const blue = parseInt(normalizedColor.slice(5, 7), 16);

    return `${red}, ${green}, ${blue}`;
};
