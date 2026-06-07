import type { CSSProperties } from 'react';

import {
    RESERVATION_COMMON_TEXT,
    RESERVATION_STATUS_TEXT,
} from '../../domains/reservation/constants';
import { useRoomDay } from '../../hooks/queries/useRoomDay';
import type { CalendarScope } from '../../types/calendarTypes';
import {
    formatTimelineDate,
    getSegmentsByHour,
    getTimelineHours,
    mapSlotsToTimelineSegments,
    type TimelineRowSegment,
} from '../../utils/timelineUtils';

interface TimelineSectionProps {
    date: string;
    scope: CalendarScope;
}

interface TimelineBarProps {
    segment: TimelineRowSegment;
    isFirst: boolean;
    isLast: boolean;
}

const getTimelineBarLabelClassName = (isPending: boolean) =>
    [
        'timeline-bar__label',
        isPending && 'is-pending',
    ]
        .filter(Boolean)
        .join(' ');

const TimelineBar = ({ segment, isFirst, isLast }: TimelineBarProps) => {
    const leftPercent = (segment.startMinute / 60) * 100;
    const widthPercent =
        ((segment.endMinute - segment.startMinute) / 60) * 100;

    const gapPx = 6;
    const leftOffset = isFirst ? 0 : gapPx / 2;
    const rightOffset = isLast ? 0 : gapPx / 2;
    const widthOffset = leftOffset + rightOffset;

    return (
        <div
            className="timeline-bar"
            style={
                {
                    '--team-color': segment.color,
                    left: `calc(${leftPercent}% + ${leftOffset}px)`,
                    width: `calc(${widthPercent}% - ${widthOffset}px)`,
                } as CSSProperties
            }
        >
            <div className="timeline-bar__content">
                <span
                    className={getTimelineBarLabelClassName(
                        segment.isPending,
                    )}
                >
                    {segment.title}
                </span>

                {segment.isPending && (
                    <span className="timeline-bar__badge">
                        {RESERVATION_COMMON_TEXT.pending}
                    </span>
                )}
            </div>
        </div>
    );
};

const TimelineSection = ({ date, scope }: TimelineSectionProps) => {
    const { data, isLoading, isError, error } = useRoomDay({
        date,
        scope,
    });

    if (isLoading) {
        return (
            <section className="timeline-section timeline-section--loading">
                <div
                    className="timeline-section__spinner"
                    aria-hidden="true"
                />

                <p className="timeline-section__loading-message">
                    {RESERVATION_STATUS_TEXT.timelineLoading}
                </p>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="timeline-section">
                {RESERVATION_STATUS_TEXT.timelineError(error.message)}
            </section>
        );
    }

    if (!data) {
        return (
            <section className="timeline-section">
                {RESERVATION_STATUS_TEXT.timelineNoData}
            </section>
        );
    }

    const hours = getTimelineHours(
        data.date,
        data.openTime,
        data.closeTime,
    );

    const segments = mapSlotsToTimelineSegments(
        data.slots,
        data.date,
        data.openTime,
    );
    const timelineRows = hours.map((hour) => ({
        hour,
        segments: getSegmentsByHour(segments, hour),
    }));
    const visibleTimelineRows = scope === 'mine'
        ? timelineRows.filter((row) => row.segments.length > 0)
        : timelineRows;

    return (
        <section className="timeline-section">
            <div className="calendar-section-divider" />

            <div className="timeline-section__date">
                {formatTimelineDate(data.date)}
            </div>

            <div className="calendar-section-divider" />

            <div className="timeline-list">
                {scope === 'mine' && visibleTimelineRows.length === 0 && (
                    <p className="timeline-list__empty">
                        {RESERVATION_STATUS_TEXT.timelineMineEmpty}
                    </p>
                )}

                {visibleTimelineRows.map((row, rowIndex) => {
                    const previousRow = visibleTimelineRows[rowIndex - 1];
                    const currentHourIndex = hours.findIndex(
                        (hour) => hour.key === row.hour.key,
                    );
                    const previousHourIndex = previousRow
                        ? hours.findIndex((hour) => hour.key === previousRow.hour.key)
                        : -1;
                    const hasOmittedHours = (
                        scope === 'mine' &&
                        previousHourIndex >= 0 &&
                        currentHourIndex - previousHourIndex > 1
                    );

                    return (
                        <div key={row.hour.key}>
                            {hasOmittedHours && (
                                <div
                                    className="timeline-gap"
                                    aria-label={RESERVATION_STATUS_TEXT.omittedHoursAriaLabel(
                                        currentHourIndex - previousHourIndex - 1,
                                    )}
                                >
                                    <span aria-hidden="true" />
                                </div>
                            )}

                            <div className="timeline-row">
                                <div className="timeline-row__time">
                                    {row.hour.label}
                                </div>

                                <div className="timeline-row__track">
                                    {row.segments.length > 0 ? (
                                        row.segments.map((segment, index) => (
                                            <TimelineBar
                                                key={`${row.hour.key}-${segment.id}`}
                                                segment={segment}
                                                isFirst={index === 0}
                                                isLast={
                                                    index ===
                                                    row.segments.length - 1
                                                }
                                            />
                                        ))
                                    ) : (
                                        <div className="timeline-row__empty" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

            </div>
        </section>
    );
};

export default TimelineSection;
