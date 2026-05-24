import { parseTimeToMinutes } from './dateTimeUtils';

export const TIME_SLOT_INTERVAL_MINUTES = 30;
export const DAY_SLOT_COUNT = 48;

export interface SlotRange {
    startSlot: number;
    endSlot: number;
}

export interface OperatingSlotRange {
    openSlot: number;
    closeSlot: number;
}

export const getSlotRange = (startTime: string, endTime: string): SlotRange => {
    const startSlot = parseTimeToMinutes(startTime) / TIME_SLOT_INTERVAL_MINUTES;
    let endSlot = parseTimeToMinutes(endTime) / TIME_SLOT_INTERVAL_MINUTES;

    if (endSlot <= startSlot) {
        endSlot += DAY_SLOT_COUNT;
    }

    return { startSlot, endSlot };
};

export const getOperatingSlotRange = (
    openTime?: string,
    closeTime?: string,
): OperatingSlotRange | null => {
    if (!openTime || !closeTime) return null;

    const openSlot = parseTimeToMinutes(openTime) / TIME_SLOT_INTERVAL_MINUTES;
    let closeSlot = parseTimeToMinutes(closeTime) / TIME_SLOT_INTERVAL_MINUTES;

    if (closeSlot <= openSlot) {
        closeSlot += DAY_SLOT_COUNT;
    }

    return { openSlot, closeSlot };
};

export const isOutsideOperatingHours = (
    operatingRange: OperatingSlotRange | null,
    startAbsoluteSlot: number,
    endAbsoluteSlot: number,
) => {
    if (!operatingRange) return false;

    const dayOffset = Math.floor(
        (startAbsoluteSlot - operatingRange.openSlot) / DAY_SLOT_COUNT,
    );
    const windowStartSlot = operatingRange.openSlot + dayOffset * DAY_SLOT_COUNT;
    const windowEndSlot = operatingRange.closeSlot + dayOffset * DAY_SLOT_COUNT;

    return (
        startAbsoluteSlot < windowStartSlot ||
        endAbsoluteSlot > windowEndSlot
    );
};

export const isStartSlotInsideOperatingHours = (
    operatingRange: OperatingSlotRange | null,
    absoluteSlot: number,
) => {
    if (!operatingRange) return true;

    const dayOffset = Math.floor(
        (absoluteSlot - operatingRange.openSlot) / DAY_SLOT_COUNT,
    );
    const windowStartSlot = operatingRange.openSlot + dayOffset * DAY_SLOT_COUNT;
    const windowEndSlot = operatingRange.closeSlot + dayOffset * DAY_SLOT_COUNT;

    return (
        absoluteSlot >= windowStartSlot &&
        absoluteSlot < windowEndSlot
    );
};

export const hasBlockedSlotOverlap = (
    blockedSlots: SlotRange[],
    startAbsoluteSlot: number,
    endAbsoluteSlot: number,
) => {
    return blockedSlots.some(({ startSlot, endSlot }) => (
        startAbsoluteSlot < endSlot && endAbsoluteSlot > startSlot
    ));
};
