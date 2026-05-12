import type { CSSProperties } from 'react';

import { useRoomDay } from '../../hooks/queries/useRoomDay';
import {
    formatTimelineDate,
    getSegmentsByHour,
    getTimelineHours,
    mapSlotsToTimelineSegments,
    type TimelineRowSegment,
} from '../../utils/timelineUtils';

interface TimelineSectionProps {
    date: string;
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
                    <span className="timeline-bar__badge">신청중</span>
                )}
            </div>
        </div>
    );
};

const TimelineSection = ({ date }: TimelineSectionProps) => {
    const { data, isLoading, isError, error } = useRoomDay({
        date,
    });

    if (isLoading) {
        return (
            <section className="timeline-section timeline-section--loading">
                <div
                    className="timeline-section__spinner"
                    aria-hidden="true"
                />

                <p className="timeline-section__loading-message">
                    예약 현황을 불러오고 있어요...
                </p>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="timeline-section">
                에러가 발생했습니다: {error.message}
            </section>
        );
    }

    if (!data) {
        return (
            <section className="timeline-section">
                데이터가 없습니다.
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

    return (
        <section className="timeline-section">
            <div className="calendar-section-divider" />

            <div className="timeline-section__date">
                {formatTimelineDate(data.date)}
            </div>

            <div className="calendar-section-divider" />

            <div className="timeline-list">
                {hours.map((hour) => {
                    const rowSegments = getSegmentsByHour(segments, hour);

                    return (
                        <div key={hour.key} className="timeline-row">
                            <div className="timeline-row__time">
                                {hour.label}
                            </div>

                            <div className="timeline-row__track">
                                {rowSegments.length > 0 ? (
                                    rowSegments.map((segment, index) => (
                                        <TimelineBar
                                            key={`${hour.key}-${segment.id}`}
                                            segment={segment}
                                            isFirst={index === 0}
                                            isLast={
                                                index ===
                                                rowSegments.length - 1
                                            }
                                        />
                                    ))
                                ) : (
                                    <div className="timeline-row__empty" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default TimelineSection;
