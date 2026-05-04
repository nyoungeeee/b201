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

        setToastMessage(message);

        const timer = window.setTimeout(() => {
            setToastMessage(null);

            navigate(location.pathname, {
                replace: true,
                state: null,
            });
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [location.state, location.pathname, navigate]);

    return (
        <div className="app-shell">
            <div className="mobile-frame">
                <div className="layout-mobile">

                    {/* 고정 영역 */}
                    {header}

                    {/* 스크롤 영역 */}
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