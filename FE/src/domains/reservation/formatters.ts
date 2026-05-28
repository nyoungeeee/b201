import type { CSSProperties } from 'react';

import type { MyReservation, ReservationState } from './types';

const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const STATE_LABEL: Record<ReservationState, string> = {
    pending: '승인대기',
    approved: '승인',
    rejected: '거절',
    canceled: '취소',
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDate = (date: Date) => (
    `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}(${DAY_LABEL[date.getDay()]})`
);

const formatTime = (date: Date) => (
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
);

const getDurationLabel = (startAt: string, endAt: string) => {
    const durationMinutes = Math.max(
        0,
        Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000),
    );
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
    if (hours > 0) return `${hours}시간`;

    return `${minutes}분`;
};

const getEndTimeLabel = (reservation: MyReservation) => {
    const start = new Date(reservation.startAt);
    const end = new Date(reservation.endAt);
    const isNextDay = start.toDateString() !== end.toDateString();

    return `${isNextDay ? '다음날 ' : ''}${formatTime(end)}`;
};

export const formatAppliedAt = (value: string) => {
    const date = new Date(value);

    return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const getReservationStateView = (reservation: MyReservation) => {
    if (
        reservation.state === 'approved' &&
        new Date(reservation.endAt) < new Date()
    ) {
        return {
            label: '이용완료',
            className: 'completed',
        };
    }

    return {
        label: STATE_LABEL[reservation.state],
        className: reservation.state,
    };
};

export const getPeriodLabel = (reservation: MyReservation) => {
    const startDateLabel = formatDate(new Date(reservation.startAt));

    if (reservation.isRepeat && reservation.repeatEndAt) {
        return `${startDateLabel} ~ ${formatDate(new Date(reservation.repeatEndAt))}`;
    }

    return startDateLabel;
};

export const getTimeLabel = (reservation: MyReservation) => (
    `${formatTime(new Date(reservation.startAt))} - ${getEndTimeLabel(reservation)}(${getDurationLabel(
        reservation.startAt,
        reservation.endAt,
    )})`
);

export const getCardStyle = (reservation: MyReservation) => {
    if (reservation.kind === 'personal' || !reservation.colorRgb) {
        return undefined;
    }

    return {
        '--reservation-card-team-bg': `rgba(${reservation.colorRgb}, 0.12)`,
    } as CSSProperties;
};
