import type { CSSProperties, KeyboardEvent } from 'react';

import { ChevronRightIcon } from '../common/icons';
import { MY_RESERVATION_CARD_TEXT } from '../../domains/reservation/constants';
import {
    formatAppliedAt,
    getCardStyle,
    getPeriodLabel,
    getReservationStateView,
    getTimeLabel,
} from '../../domains/reservation/formatters';
import type { MyReservation } from '../../domains/reservation/types';

interface MyReservationCardProps {
    index: number;
    reservation: MyReservation;
    onSelect: (reservation: MyReservation) => void;
}

const MyReservationCard = ({
    index,
    reservation,
    onSelect,
}: MyReservationCardProps) => {
    const stateView = getReservationStateView(reservation);
    const handleSelect = () => onSelect(reservation);
    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        handleSelect();
    };

    return (
        <article
            className={[
                'my-reservation-card',
                'my-reservation-card--clickable',
                `my-reservation-card--${reservation.kind}`,
            ].join(' ')}
            style={{
                ...getCardStyle(reservation),
                '--reservation-card-index': index,
            } as CSSProperties}
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
        >
            <div className="my-reservation-card__top">
                <span
                    className={[
                        'my-reservation-card__state',
                        `my-reservation-card__state--${stateView.className}`,
                    ].join(' ')}
                >
                    {stateView.label}
                </span>

                <span className="my-reservation-card__arrow" aria-hidden="true">
                    <ChevronRightIcon />
                </span>
            </div>

            <div className="my-reservation-card__title-row">
                <span
                    className="my-reservation-card__dot"
                    style={{ backgroundColor: reservation.color }}
                />
                <h2>{reservation.title}</h2>
                {reservation.isRepeat && (
                    <span className="my-reservation-card__repeat">
                        {MY_RESERVATION_CARD_TEXT.repeat}
                    </span>
                )}
                {reservation.isRepeat && reservation.conflictCount && (
                    <span className="my-reservation-card__conflict">
                        {MY_RESERVATION_CARD_TEXT.conflictCount(
                            reservation.conflictCount,
                        )}
                    </span>
                )}
            </div>

            <dl className="my-reservation-card__details">
                <div>
                    <dt>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                        </svg>
                    </dt>
                    <dd>{getPeriodLabel(reservation)}</dd>
                </div>

                <div>
                    <dt>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </dt>
                    <dd>{getTimeLabel(reservation)}</dd>
                </div>
            </dl>

            <div className="my-reservation-card__meta">
                <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                    </svg>
                    {MY_RESERVATION_CARD_TEXT.applicant(reservation.applicant)}
                </span>
                <span className="my-reservation-card__applied-at">
                    {MY_RESERVATION_CARD_TEXT.appliedAt(
                        formatAppliedAt(reservation.appliedAt),
                    )}
                </span>
            </div>
        </article>
    );
};

export default MyReservationCard;
