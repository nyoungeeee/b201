import {
    useEffect,
    useRef,
    type MutableRefObject,
    type PointerEvent,
} from 'react';

export interface RepeatOption {
    label: string;
    value: number;
}

interface VisibleRepeatOption {
    option: RepeatOption | null;
    distance: number;
}

interface ReservationRepeatPickerProps {
    options: RepeatOption[];
    selectedValue: number;
    onStepRepeat: (direction: -1 | 1) => void;
    onSelectRepeat: (value: number) => void;
}

const DRAG_STEP_PX = 28;
const VISIBLE_REPEAT_RANGE = 3;

const getWheelDirection = (deltaY: number): -1 | 1 => {
    return deltaY > 0 ? 1 : -1;
};

const getDistanceClass = (distance: number) => {
    const normalizedDistance = Math.min(Math.abs(distance), 3);

    return `is-distance-${normalizedDistance}`;
};

const getVisibleRepeatOptions = (
    options: RepeatOption[],
    selectedIndex: number,
): VisibleRepeatOption[] => {
    return Array.from(
        { length: VISIBLE_REPEAT_RANGE * 2 + 1 },
        (_, index) => {
            const distance = index - VISIBLE_REPEAT_RANGE;
            const option = options[selectedIndex + distance] ?? null;

            return { option, distance };
        },
    );
};

const ReservationRepeatPicker = ({
    options,
    selectedValue,
    onStepRepeat,
    onSelectRepeat,
}: ReservationRepeatPickerProps) => {
    const dragStartY = useRef<number | null>(null);
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const selectedIndex = options.findIndex((option) => option.value === selectedValue);
    const visibleOptions = getVisibleRepeatOptions(options, selectedIndex);

    useEffect(() => {
        const wheelElement = wheelRef.current;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            onStepRepeat(getWheelDirection(event.deltaY));
        };

        wheelElement?.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            wheelElement?.removeEventListener('wheel', handleWheel);
        };
    }, [onStepRepeat]);

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
    ) => {
        if (targetRef.current === null) return;

        const deltaY = event.clientY - targetRef.current;
        const stepCount = Math.trunc(Math.abs(deltaY) / DRAG_STEP_PX);

        if (stepCount === 0) return;

        const direction = deltaY > 0 ? -1 : 1;

        Array.from({ length: stepCount }).forEach(() => {
            onStepRepeat(direction);
        });

        targetRef.current = event.clientY;
    };

    const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        dragStartY.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <section className="reservation-repeat-section" aria-label="반복 여부 선택">
            <h2 className="reservation-repeat-section__title">반복 여부</h2>

            <div
                ref={wheelRef}
                className="reservation-repeat-picker"
                onPointerDown={(event) => handlePointerDown(event, dragStartY)}
                onPointerMove={(event) => handlePointerMove(event, dragStartY)}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                role="listbox"
                aria-label="반복 여부 선택"
                aria-activedescendant={`reservation-repeat-${selectedValue}`}
            >
                <div className="reservation-repeat-picker__selection" aria-hidden="true" />

                {visibleOptions.map(({ option, distance }) => {
                    if (!option) {
                        return (
                            <div
                                key={`repeat-empty-${distance}`}
                                className={[
                                    'reservation-repeat-option',
                                    'reservation-repeat-option--empty',
                                    getDistanceClass(distance),
                                ].join(' ')}
                                aria-hidden="true"
                            />
                        );
                    }

                    const isSelected = option.value === selectedValue;

                    return (
                        <button
                            key={option.value}
                            id={`reservation-repeat-${option.value}`}
                            type="button"
                            className={[
                                'reservation-repeat-option',
                                isSelected ? 'is-selected' : '',
                                getDistanceClass(distance),
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => onSelectRepeat(option.value)}
                            role="option"
                            aria-selected={isSelected}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default ReservationRepeatPicker;
