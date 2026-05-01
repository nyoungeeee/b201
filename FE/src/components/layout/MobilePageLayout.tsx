import type { ReactNode } from "react";

type MobilePageLayoutProps = {
    header?: ReactNode;
    children: ReactNode;
};

const MobilePageLayout = ({ header, children }: MobilePageLayoutProps) => {
    return (
        <div className="app-shell">
            <div className="mobile-frame">
                <div className="layout-mobile">

                    {/* 고정 영역 */}
                    {header}

                    {/* 스크롤 영역 */}
                    <div className="layout-content">
                        {children}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MobilePageLayout;