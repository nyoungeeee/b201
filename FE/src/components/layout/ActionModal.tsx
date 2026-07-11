// components/modal/ActionModal.tsx

interface ActionModalProps {
    icon?: React.ReactNode;
    title: string;
    description?: React.ReactNode;
    children?: React.ReactNode;

    cancelText?: string;
    confirmText?: string;

    confirmVariant?: 'primary' | 'danger';
    isCancelDisabled?: boolean;
    isConfirmDisabled?: boolean;
    showCancelButton?: boolean;
    panelClassName?: string;

    onCancel?: () => void;
    onConfirm?: () => void;
}

const ActionModal = ({
    icon,
    title,
    description,
    children,

    cancelText = '취소',
    confirmText = '확인',

    confirmVariant = 'primary',
    isCancelDisabled = false,
    isConfirmDisabled = false,
    showCancelButton = true,
    panelClassName = '',

    onCancel,
    onConfirm,
}: ActionModalProps) => {
    return (
        <div className="action-modal">
            <div className="action-modal__backdrop" onClick={onCancel} />

            <section className={`action-modal__panel ${panelClassName}`.trim()}>
                {icon && (
                    <div className="action-modal__icon">
                        {icon}
                    </div>
                )}

                <h2 className="action-modal__title">
                    {title}
                </h2>

                {description && (
                    <div className="action-modal__description">
                        {description}
                    </div>
                )}

                {children}

                <div className="action-modal__actions">
                    {showCancelButton && (
                        <button
                            type="button"
                            className="action-modal__button action-modal__button--cancel"
                            disabled={isCancelDisabled}
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}

                    <button
                        type="button"
                        className={`action-modal__button ${confirmVariant === 'danger'
                            ? 'action-modal__button--danger'
                            : 'action-modal__button--primary'
                            }`}
                        disabled={isConfirmDisabled}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ActionModal;
