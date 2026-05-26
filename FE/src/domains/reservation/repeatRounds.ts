import type {
    ReservationCreateResponse,
    ReservationDetailResponse,
    ReservationOccurrenceDetail,
} from '../../apis/reservationApi';
import { addDays, getDateDistance } from '../../utils/dateTimeUtils';
import { getReservationEndAt, mapReservationState } from './mapper';
import type { MyReservation, ReservationState } from './types';

export type RepeatRoundStatus =
    | 'pending'
    | 'completed'
    | 'approved'
    | 'rejected'
    | 'conflict'
    | 'canceled';

export interface RepeatRound {
    round: number;
    reservationNumber?: number;
    date: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    status: RepeatRoundStatus;
    approvedAt?: string;
    canceledAt?: string;
    canceledBy?: string | number;
}

const formatRoundTime = (time: string) => time.slice(0, 5);

const getOccurrenceEndDate = (occurrence: ReservationOccurrenceDetail) => (
    occurrence.end_time <= occurrence.start_time
        ? addDays(occurrence.end_date, 1)
        : occurrence.end_date
);

const mapOccurrenceStatus = (
    occurrence: ReservationOccurrenceDetail,
    now: Date,
): RepeatRoundStatus => {
    if (occurrence.status === 'CONFLICT') return 'conflict';
    if (occurrence.status === 'CANCELED' || occurrence.status === 'CANCELLED') {
        return 'canceled';
    }
    if (occurrence.status === 'PENDING' || occurrence.status === 'REAPPLIED') {
        return 'pending';
    }
    if (occurrence.status === 'REJECTED') return 'rejected';
    if (
        (occurrence.status === 'APPROVED' || occurrence.status === 'RESERVED') &&
        new Date(`${getOccurrenceEndDate(occurrence)}T${occurrence.end_time}`) < now
    ) {
        return 'completed';
    }

    return 'approved';
};

export const mapReservationDetailRounds = (
    detail: ReservationDetailResponse,
    now = new Date(),
): RepeatRound[] => (
    detail.occurrences.map((occurrence, index) => ({
        round: occurrence.week ?? index + 1,
        reservationNumber: occurrence.reservation_number ?? undefined,
        date: occurrence.date,
        endDate: getOccurrenceEndDate(occurrence),
        startTime: formatRoundTime(occurrence.start_time),
        endTime: formatRoundTime(occurrence.end_time),
        status: mapOccurrenceStatus(occurrence, now),
        approvedAt: occurrence.approved_at ?? undefined,
        canceledAt: occurrence.canceled_at ?? undefined,
        canceledBy: occurrence.canceled_by ?? undefined,
    }))
);

export const mapCreatedRepeatRounds = (
    response: ReservationCreateResponse,
): RepeatRound[] => {
    const firstReservation = response.reservations[0];

    if (!firstReservation) return [];

    const rounds: RepeatRound[] = response.reservations.map((reservation) => ({
        round: Math.max(
            1,
            Math.round(
                getDateDistance(firstReservation.start_date, reservation.start_date) / 7,
            ) + 1,
        ),
        reservationNumber: reservation.reservation_number,
        date: reservation.start_date,
        endDate: getReservationEndAt(reservation).slice(0, 10),
        startTime: formatRoundTime(reservation.start_time),
        endTime: formatRoundTime(reservation.end_time),
        status: mapReservationState(reservation.status),
    }));
    const conflictRounds: RepeatRound[] = (response.skipped_occurrences ?? []).map(
        (occurrence) => ({
            round: occurrence.week,
            date: occurrence.date,
            startTime: formatRoundTime(firstReservation.start_time),
            endTime: formatRoundTime(firstReservation.end_time),
            status: 'conflict',
        }),
    );

    return [...rounds, ...conflictRounds].sort((a, b) => a.round - b.round);
};

const getRoundDateTime = (round: RepeatRound, time: string, date = round.date) => (
    `${date}T${time}:00`
);

const getRoundReservationState = (status: RepeatRoundStatus): ReservationState => {
    if (status === 'pending') return 'pending';
    if (status === 'rejected') return 'rejected';
    if (status === 'canceled') return 'canceled';

    return 'approved';
};

export const createRepeatRoundReservation = (
    reservation: MyReservation,
    round: RepeatRound,
): MyReservation => ({
    ...reservation,
    startAt: getRoundDateTime(round, round.startTime),
    endAt: getRoundDateTime(round, round.endTime, round.endDate),
    repeatEndAt: undefined,
    isRepeat: false,
    approvedAt: round.approvedAt,
    state: getRoundReservationState(round.status),
    canceledAt: round.canceledAt ?? reservation.canceledAt,
    canceledBy: round.canceledBy ?? reservation.canceledBy,
});
