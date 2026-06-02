import {
    useEffect,
    useRef,
    type MutableRefObject,
    type PointerEvent,
} from 'react';

export interface ReservationTeamOption {
    label: string;
    value: string;
}

interface VisibleTeamOption {
    option: ReservationTeamOption | null;
    distance: number;
}

interface ReservationTeamPickerProps {
    options: ReservationTeamOption[];
    selectedValue: string;
    onStepTeam: (direction: -1 | 1) => void;
    onSelectTeam: (value: string) => void;
}

const DRAG_STEP_PX = 28;
const VISIBLE_TEAM_RANGE = 3;

const getWheelDirection = (deltaY: number): -1 | 1 => {
    return deltaY > 0 ? 1 : -1;
};

const getDistanceClass = (distance: number) => {
    const normalizedDistance = Math.min(Math.abs(distance), 3);

    return `is-distance-${normalizedDistance}`;
};

const getVisibleTeamOptions = (
    options: ReservationTeamOption[],
    selectedIndex: number,
): VisibleTeamOption[] => {
    return Array.from(
        { length: VISIBLE_TEAM_RANGE * 2 + 1 },
        (_, index) => {
            const distance = index - VISIBLE_TEAM_RANGE;
            const option = options[selectedIndex + distance] ?? null;

            return { option, distance };
        },
    );
};

const ReservationTeamPicker = ({
    options,
    selectedValue,
    onStepTeam,
    onSelectTeam,
}: ReservationTeamPickerProps) => {
    const dragStartY = useRef<number | null>(null);
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const selectedIndex = options.findIndex((option) => option.value === selectedValue);
    const visibleOptions = getVisibleTeamOptions(options, selectedIndex);

    useEffect(() => {
        const wheelElement = wheelRef.current;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            onStepTeam(getWheelDirection(event.deltaY));
        };

        wheelElement?.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            wheelElement?.removeEventListener('wheel', handleWheel);
        };
    }, [onStepTeam]);

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
            onStepTeam(direction);
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
        <section className="reservation-team-section" aria-label="팀 설정">
            <h2 className="reservation-team-section__title">팀 설정</h2>

            <div
                ref={wheelRef}
                className="reservation-team-picker"
                onPointerDown={(event) => handlePointerDown(event, dragStartY)}
                onPointerMove={(event) => handlePointerMove(event, dragStartY)}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                role="listbox"
                aria-label="팀 설정"
                aria-activedescendant={`reservation-team-${selectedValue}`}
            >
                <div className="reservation-team-picker__selection" aria-hidden="true" />

                {visibleOptions.map(({ option, distance }) => {
                    if (!option) {
                        return (
                            <div
                                key={`team-empty-${distance}`}
                                className={[
                                    'reservation-team-option',
                                    'reservation-team-option--empty',
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
                            id={`reservation-team-${option.value}`}
                            type="button"
                            className={[
                                'reservation-team-option',
                                isSelected ? 'is-selected' : '',
                                getDistanceClass(distance),
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => onSelectTeam(option.value)}
                            role="option"
                            aria-selected={isSelected}
                        >
                            <span className="reservation-team-option__label">
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default ReservationTeamPicker;
