import type { ReactNode } from "react";

type MobilePageLayoutProps = {
    children: ReactNode;
};

const MobilePageLayout = ({ children }: MobilePageLayoutProps) => {
    return (
        <div className="app-shell">
            <div className="mobile-frame">{children}</div>
        </div>
    );
};

export default MobilePageLayout;