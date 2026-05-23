import { useRef, type MutableRefObject, type PointerEvent, type WheelEvent } from 'react';

export type Meridiem = '오전' | '오후';

export interface TimeWheelOption {
    key: string;
    label: string;
    dateLabel: string;
    meridiem: Meridiem;
    reserved?: boolean;
}

interface ReservationStartTimePickerProps {
    title: string;
    ariaLabel: string;
    times: TimeWheelOption[];
    selectedTimeKey: string;
    meridiem: Meridiem;
    onStepMeridiem: (direction: -1 | 1) => void;
    onSelectMeridiem: (value: Meridiem) => void;
    onStepTime: (direction: -1 | 1) => void;
    onSelectTime: (key: string) => void;
}

const DRAG_STEP_PX = 28;
const meridiems: Meridiem[] = ['오전', '오후'];

const getWheelDirection = (deltaY: number): -1 | 1 => {
    return deltaY > 0 ? 1 : -1;
};

const getDistanceClass = (distance: number) => {
    const normalizedDistance = Math.min(Math.abs(distance), 3);

    return `is-distance-${normalizedDistance}`;
};

const getMeridiemOffset = (item: Meridiem, selected: Meridiem) => {
    if (item === selected) return 0;

    return selected === '오전' ? 1 : -1;
};

const ReservationStartTimePicker = ({
    title,
    ariaLabel,
    times,
    selectedTimeKey,
    meridiem,
    onStepMeridiem,
    onSelectMeridiem,
    onStepTime,
    onSelectTime,
}: ReservationStartTimePickerProps) => {
    const meridiemDragStartY = useRef<number | null>(null);
    const timeDragStartY = useRef<number | null>(null);

    const selectedIndex = times.findIndex((option) => option.key === selectedTimeKey);

    const handleMeridiemWheel = (event: WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        onStepMeridiem(getWheelDirection(event.deltaY));
    };

    const handleTimeWheel = (event: WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        onStepTime(getWheelDirection(event.deltaY));
    };

    const handlePointerDown = (
        event: PointerEvent<HTMLDivElement>,
        targetRef: MutableRefObject<number | null>,
    ) => {
        targetRef.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (
        event: PointerEvent<HTMLDivElement>,
        targetRef: MutableRefObject<number | null>,
        onStep: (direction: -1 | 1) => void,
    ) => {
        if (targetRef.current === null) return;

        const deltaY = event.clientY - targetRef.current;
        const stepCount = Math.trunc(Math.abs(deltaY) / DRAG_STEP_PX);

        if (stepCount === 0) return;

        const direction = deltaY > 0 ? -1 : 1;

        Array.from({ length: stepCount }).forEach(() => {
            onStep(direction);
        });

        targetRef.current = event.clientY;
    };

    const handlePointerEnd = (
        event: PointerEvent<HTMLDivElement>,
        targetRef: MutableRefObject<number | null>,
    ) => {
        targetRef.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <section className="reservation-time-section" aria-label={ariaLabel}>
            <h2 className="reservation-time-section__title">{title}</h2>

            <div
                className="reservation-time-picker"
                role="listbox"
                aria-label={ariaLabel}
                aria-activedescendant={`reservation-time-${selectedTimeKey}`}
            >
                <div className="reservation-time-picker__selection" aria-hidden="true" />

                <div
                    className="reservation-time-picker__date-time"
                    onWheel={handleTimeWheel}
                    onPointerDown={(event) => handlePointerDown(event, timeDragStartY)}
                    onPointerMove={(event) => (
                        handlePointerMove(event, timeDragStartY, onStepTime)
                    )}
                    onPointerUp={(event) => handlePointerEnd(event, timeDragStartY)}
                    onPointerCancel={(event) => handlePointerEnd(event, timeDragStartY)}
                >
                    {times.map((option, index) => {
                        const distance = index - selectedIndex;
                        const isSelected = option.key === selectedTimeKey;
                        const selectedOption = times[selectedIndex];
                        const showDate = isSelected ||
                            (
                                Math.abs(distance) === 1 &&
                                !!selectedOption &&
                                selectedOption.dateLabel !== option.dateLabel
                            );

                        return (
                            <button
                                key={option.key}
                                id={`reservation-time-${option.key}`}
                                type="button"
                                className={[
                                    'reservation-time-picker__row',
                                    isSelected ? 'is-selected' : '',
                                    option.reserved ? 'is-reserved' : '',
                                    getDistanceClass(distance),
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onClick={() => {
                                    if (!option.reserved) {
                                        onSelectTime(option.key);
                                    }
                                }}
                                disabled={option.reserved}
                                aria-disabled={option.reserved}
                                role="option"
                                aria-selected={isSelected}
                            >
                                <span className="reservation-time-picker__date">
                                    {showDate ? option.dateLabel : ''}
                                </span>
                                <span className="reservation-time-picker__time">
                                    {option.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div
                    className="reservation-time-picker__meridiem-wheel"
                    onWheel={handleMeridiemWheel}
                    onPointerDown={(event) => handlePointerDown(event, meridiemDragStartY)}
                    onPointerMove={(event) => (
                        handlePointerMove(event, meridiemDragStartY, onStepMeridiem)
                    )}
                    onPointerUp={(event) => handlePointerEnd(event, meridiemDragStartY)}
                    onPointerCancel={(event) => handlePointerEnd(event, meridiemDragStartY)}
                    role="listbox"
                    aria-label="오전 오후 선택"
                    aria-activedescendant={`reservation-meridiem-${meridiem}`}
                >
                    {meridiems.map((item) => {
                        const offset = getMeridiemOffset(item, meridiem);

                        return (
                            <button
                                key={item}
                                id={`reservation-meridiem-${item}`}
                                type="button"
                                className={[
                                    'reservation-meridiem-option',
                                    item === meridiem ? 'is-selected' : '',
                                    `is-offset-${offset}`,
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onClick={() => onSelectMeridiem(item)}
                                role="option"
                                aria-selected={item === meridiem}
                            >
                                {item}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ReservationStartTimePicker;
