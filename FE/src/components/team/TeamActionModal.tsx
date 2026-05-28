import type { ReactNode } from 'react';

type TeamActionModalConfirmVariant = 'primary' | 'danger' | 'confirm';

interface TeamActionModalProps {
    icon: ReactNode;
    title: string;
    description: ReactNode;
    cancelLabel: string;
    confirmLabel: string;
    confirmVariant?: TeamActionModalConfirmVariant;
    isConfirmDisabled?: boolean;
    children?: ReactNode;
    onCancel: () => void;
    onConfirm: () => void;
}

const getConfirmButtonClassName = (
    variant: TeamActionModalConfirmVariant,
) =>
    [
        'team-modal__button',
        `team-modal__button--${variant}`,
    ].join(' ');

const TeamActionModal = ({
    icon,
    title,
    description,
    cancelLabel,
    confirmLabel,
    confirmVariant = 'primary',
    isConfirmDisabled = false,
    children,
    onCancel,
    onConfirm,
}: TeamActionModalProps) => {
    return (
        <div className="team-modal">
            <div
                className="team-modal__backdrop"
                onClick={onCancel}
            />

            <section className="team-modal__panel">
                {icon}

                <h2 className="team-modal__title">
                    {title}
                </h2>

                <p className="team-modal__description">
                    {description}
                </p>

                {children}

                <div className="team-modal__actions">
                    <button
                        type="button"
                        className="team-modal__button team-modal__button--cancel"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className={getConfirmButtonClassName(
                            confirmVariant,
                        )}
                        onClick={onConfirm}
                        disabled={isConfirmDisabled}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default TeamActionModal;
