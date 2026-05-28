import {
    useEffect,
    useRef,
    useState,
    type ReactNode,
    type TouchEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

type MobilePageLayoutProps = {
    header?: ReactNode;
    children: ReactNode;
    isRefreshing?: boolean;
    onRefresh?: () => void | Promise<unknown>;
};

const PULL_REFRESH_THRESHOLD = 72;
const PULL_REFRESH_MAX_DISTANCE = 96;

const removeToastMessageFromState = (
    state: Record<string, unknown> | null,
) => {
    if (!state) return null;

    const remainingState = { ...state };
    delete remainingState.toastMessage;

    return Object.keys(remainingState).length > 0 ? remainingState : null;
};

const MobilePageLayout = ({
    header,
    children,
    isRefreshing = false,
    onRefresh,
}: MobilePageLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPullRefreshing, setIsPullRefreshing] = useState(false);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const isPullingRef = useRef(false);
    const canPullToRefresh = !!onRefresh;
    const refreshInProgress = isRefreshing || isPullRefreshing;

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

    const resetPullState = () => {
        touchStartYRef.current = null;
        isPullingRef.current = false;
        setPullDistance(0);
    };

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        if (!canPullToRefresh || refreshInProgress) return;

        const content = contentRef.current;
        if (!content || content.scrollTop > 0) return;

        touchStartYRef.current = event.touches[0]?.clientY ?? null;
        isPullingRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        if (!canPullToRefresh || refreshInProgress) return;

        const startY = touchStartYRef.current;
        if (startY === null) return;

        const content = contentRef.current;
        if (!content || content.scrollTop > 0) {
            resetPullState();
            return;
        }

        const currentY = event.touches[0]?.clientY;
        if (typeof currentY !== 'number') return;

        const distance = currentY - startY;
        if (distance <= 0) {
            setPullDistance(0);
            return;
        }

        isPullingRef.current = true;
        event.preventDefault();
        setPullDistance(Math.min(distance * 0.55, PULL_REFRESH_MAX_DISTANCE));
    };

    const handleTouchEnd = () => {
        if (!canPullToRefresh || refreshInProgress) {
            resetPullState();
            return;
        }

        const shouldRefresh =
            isPullingRef.current && pullDistance >= PULL_REFRESH_THRESHOLD;

        resetPullState();

        if (!shouldRefresh || !onRefresh) return;

        setIsPullRefreshing(true);
        Promise.resolve()
            .then(() => onRefresh())
            .finally(() => {
                setIsPullRefreshing(false);
            });
    };

    return (
        <div className="app-shell">
            <div className="mobile-frame">
                <div className="layout-mobile">

                    {header}

                    <div
                        ref={contentRef}
                        className="layout-content"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={resetPullState}
                    >
                        {canPullToRefresh && (
                            <div
                                className={[
                                    'pull-to-refresh',
                                    refreshInProgress ? 'is-refreshing' : '',
                                    pullDistance >= PULL_REFRESH_THRESHOLD
                                        ? 'is-ready'
                                        : '',
                                ].filter(Boolean).join(' ')}
                                style={{
                                    transform: `translateY(${refreshInProgress ? 0 : pullDistance - PULL_REFRESH_MAX_DISTANCE}px)`,
                                }}
                                aria-hidden="true"
                            >
                                <span className="pull-to-refresh__spinner" />
                            </div>
                        )}

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
