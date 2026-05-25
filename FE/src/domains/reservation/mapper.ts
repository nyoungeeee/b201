import type { ReservationListItem } from '../../apis/reservationApi';
import { getColorRgb, normalizeHexColor } from '../../utils/colorUtils';
import { addDays, createDateTimeString } from '../../utils/dateTimeUtils';
import type { MyReservation, ReservationState } from './types';

interface MapReservationOptions {
    conflictCount?: number;
    isRepeat?: boolean;
    repeatEndAt?: string;
}

export const mapReservationState = (
    status: ReservationListItem['status'],
): ReservationState => {
    if (status === 'APPROVED' || status === 'RESERVED') return 'approved';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'CANCELED' || status === 'CANCELLED') return 'canceled';

    return 'pending';
};

export const getReservationEndAt = (reservation: ReservationListItem) => {
    const startAt = createDateTimeString(reservation.start_date, reservation.start_time);
    const endAt = createDateTimeString(reservation.end_date, reservation.end_time);

    if (new Date(endAt) > new Date(startAt)) return endAt;

    return createDateTimeString(addDays(reservation.end_date, 1), reservation.end_time);
};

export const mapReservationListItem = (
    reservation: ReservationListItem,
    options: MapReservationOptions = {},
): MyReservation => ({
    id: reservation.reservation_number,
    title: reservation.type === 'private'
        ? '개인 연습'
        : reservation.team_name ?? reservation.room_name,
    applicant: reservation.applicant_name,
    appliedAt: reservation.created_at,
    startAt: createDateTimeString(reservation.start_date, reservation.start_time),
    endAt: getReservationEndAt(reservation),
    state: mapReservationState(reservation.status),
    kind: reservation.type === 'private' ? 'personal' : 'team',
    isRepeat: options.isRepeat ?? reservation.kind === 'repeat',
    conflictCount: (options.conflictCount ?? reservation.conflict_count) || undefined,
    repeatEndAt: options.repeatEndAt,
    color: normalizeHexColor(reservation.color),
    colorRgb: reservation.type === 'team'
        ? getColorRgb(reservation.color)
        : undefined,
});
