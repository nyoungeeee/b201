import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type MobilePageLayoutProps = {
    header?: ReactNode;
    children: ReactNode;
};

const MobilePageLayout = ({ header, children }: MobilePageLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        const message = location.state?.toastMessage;

        if (!message) return;

        const showTimer = window.setTimeout(() => {
            setToastMessage(message);
        }, 0);

        const hideTimer = window.setTimeout(() => {
            setToastMessage(null);
            const { toastMessage: _toastMessage, ...remainingState } = location.state ?? {};
            const hasRemainingState = Object.keys(remainingState).length > 0;

            navigate('.', {
                replace: true,
                state: hasRemainingState ? remainingState : null,
            });
        }, 2000);

        return () => {
            window.clearTimeout(showTimer);
            window.clearTimeout(hideTimer);
        };
    }, [location.state?.toastMessage, navigate]);

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
