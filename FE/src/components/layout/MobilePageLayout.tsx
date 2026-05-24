import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type MobilePageLayoutProps = {
    header?: ReactNode;
    children: ReactNode;
};

const removeToastMessageFromState = (
    state: Record<string, unknown> | null,
) => {
    if (!state) return null;

    const remainingState = { ...state };
    delete remainingState.toastMessage;

    return Object.keys(remainingState).length > 0 ? remainingState : null;
};

const MobilePageLayout = ({ header, children }: MobilePageLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        const currentState = location.state as Record<string, unknown> | null;
        const message = currentState?.toastMessage;

        if (typeof message !== 'string') return;

        const showTimer = window.setTimeout(() => {
            setToastMessage(message);
        }, 0);

        const hideTimer = window.setTimeout(() => {
            setToastMessage(null);

            navigate('.', {
                replace: true,
                state: removeToastMessageFromState(currentState),
            });
        }, 2000);

        return () => {
            window.clearTimeout(showTimer);
            window.clearTimeout(hideTimer);
        };
    }, [location.state, navigate]);

    return (
        <div className="app-shell">
            <div className="mobile-frame">
                <div className="layout-mobile">

                    {header}

                    <div className="layout-content">
                        {children}

                        {toastMessage && (
                            <div className="toast">
                                {toastMessage}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MobilePageLayout;
