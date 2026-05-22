import type { ReactNode } from 'react';

export type ReservationStepKey = 'date' | 'startTime' | 'endTime' | 'repeat' | 'type';

export interface ReservationStep {
    key: ReservationStepKey;
    label: string;
    value: string;
    icon: 'calendar' | 'clock' | 'repeat' | 'people' | 'checkCalendar';
    completed?: boolean;
    disabled?: boolean;
    muted?: boolean;
}

interface ReservationStepTabsProps {
    steps: ReservationStep[];
    activeStep: ReservationStepKey | null;
    onSelectStep: (step: ReservationStepKey) => void;
}

const StepIcon = ({ type }: { type: ReservationStep['icon'] }) => {
    const icons: Record<ReservationStep['icon'], ReactNode> = {
        calendar: (
            <>
                <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                <path d="M8 12h2v2H8zM14 12h2v2h-2zM8 16h2v2H8zM14 16h2v2h-2z" />
            </>
        ),
        checkCalendar: (
            <>
                <circle cx="12" cy="12" r="8" />
                <path d="m8.8 12.1 2 2 4.5-4.6" />
            </>
        ),
        clock: (
            <>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
            </>
        ),
        repeat: (
            <>
                <path d="M17 4l3 3-3 3" />
                <path d="M4 7h16" />
                <path d="M7 20l-3-3 3-3" />
                <path d="M20 17H4" />
            </>
        ),
        people: (
            <>
                <circle cx="9" cy="10" r="3" />
                <circle cx="16" cy="9" r="2.4" />
                <path d="M3.8 19a5.4 5.4 0 0 1 10.4 0" />
                <path d="M13.8 14.8A4.4 4.4 0 0 1 20.2 19" />
            </>
        ),
    };

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            {icons[type]}
        </svg>
    );
};

const ReservationStepTabs = ({
    steps,
    activeStep,
    onSelectStep,
}: ReservationStepTabsProps) => {
    return (
        <section className="reservation-step-list" aria-label="예약 조건">
            {steps.map((step, index) => {
                const isActive = step.key === activeStep;
                const isCompleted = Boolean(step.completed) && !isActive;
                const connectorState = isCompleted
                    ? 'solid'
                    : isActive
                      ? 'active'
                      : 'pending';

                return (
                    <div key={step.key} className="reservation-step-item">
                        <button
                            type="button"
                            className={[
                                'reservation-step',
                                isActive ? 'reservation-step--active' : '',
                                isCompleted ? 'reservation-step--completed' : '',
                                !isActive && !isCompleted ? 'reservation-step--pending' : '',
                                step.disabled || step.muted ? 'reservation-step--disabled' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => onSelectStep(step.key)}
                            disabled={step.disabled}
                        >
                            <StepIcon type={isCompleted ? 'checkCalendar' : step.icon} />
                            <span>{step.value}</span>
                        </button>

                        {index < steps.length - 1 && (
                            <span
                                className={[
                                    'reservation-step-connector',
                                    `reservation-step-connector--${connectorState}`,
                                ].join(' ')}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                );
            })}
        </section>
    );
};

export default ReservationStepTabs;
