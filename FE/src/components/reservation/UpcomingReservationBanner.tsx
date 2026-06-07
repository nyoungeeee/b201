import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { mapReservationListItem } from '../../domains/reservation/mapper';
import type { MyReservation } from '../../domains/reservation/types';
import { useReservations } from '../../hooks/queries/useReservations';
import { useAuthSession } from '../../hooks/useAuthSession';
import { getDateDistance } from '../../utils/dateTimeUtils';
import { getTodayInSeoul } from '../../utils/timelineUtils';
import { ChevronRightIcon } from '../common/icons';

const getReservationDateLabel = (reservation: MyReservation) => {
    const reservationDate = reservation.startAt.slice(0, 10);
    const dateDistance = getDateDistance(getTodayInSeoul(), reservationDate);

    if (dateDistance === 0) return '오늘';
    if (dateDistance === 1) return '내일';

    const [, month, date] = reservationDate.split('-');

    return `${Number(month)}/${Number(date)}`;
};

const getReservationTimeLabel = (reservation: MyReservation) => (
    `${reservation.startAt.slice(11, 16)} - ${reservation.endAt.slice(11, 16)}`
);

const UpcomingReservationBanner = () => {
    const navigate = useNavigate();
    const { accessToken } = useAuthSession();
    const { data, isError } = useReservations({
        accessToken,
        period: 'upcoming',
        sort: 'upcoming',
        status: ['APPROVED'],
        size: 1,
    });
    const reservation = useMemo(() => {
        const firstReservation = data?.reservations[0];

        return firstReservation
            ? mapReservationListItem(firstReservation)
            : undefined;
    }, [data]);

    if (!accessToken || isError || !reservation) return null;

    const handleOpenReservation = () => {
        navigate(`/reservations/${reservation.id}`, {
            state: {
                temporaryReservation: reservation,
            },
        });
    };

    return (
        <button
            type="button"
            className="upcoming-reservation-banner"
            onClick={handleOpenReservation}
        >
            <span className="upcoming-reservation-banner__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                </svg>
            </span>

            <span className="upcoming-reservation-banner__label">
                다가오는 예약
            </span>

            <span className="upcoming-reservation-banner__summary">
                {getReservationDateLabel(reservation)} {getReservationTimeLabel(reservation)} {reservation.title}
            </span>

            <span className="upcoming-reservation-banner__arrow" aria-hidden="true">
                <ChevronRightIcon size={20} />
            </span>
        </button>
    );
};

export default UpcomingReservationBanner;
