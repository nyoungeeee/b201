import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  AdminExitIcon,
  AdminReservationIcon,
  AdminRoomIcon,
  AdminUserIcon,
  AdminMemoIcon,
} from "./icons";

type AdminLayoutProps = {
  children?: ReactNode | ((activeNavId: AdminNavId, setActiveNavId: (navId: AdminNavId) => void) => ReactNode);
  onNavChange?: (navId: AdminNavId) => void;
  toastMessage?: string | null;
};

const adminNavItems = [
  { id: "reservation", label: "예약 관리", icon: AdminReservationIcon },
  { id: "user", label: "사용자 관리", icon: AdminUserIcon },
  { id: "room", label: "합주실 관리", icon: AdminRoomIcon },
  { id: "log", label: "기록보기", icon: AdminMemoIcon },
] as const;

export type AdminNavId = (typeof adminNavItems)[number]["id"];

const AdminLayout = ({ children, onNavChange, toastMessage }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [activeNavId, setActiveNavId] = useState<AdminNavId>(adminNavItems[0].id);
  const activeNavItem = adminNavItems.find((item) => item.id === activeNavId) ?? adminNavItems[0];
  const handleNavChange = (navId: AdminNavId) => {
    onNavChange?.(navId);
    setActiveNavId(navId);
  };

  return (
    <div className="app-shell">
      <div className="mobile-frame admin-frame">
        <div className="admin-mobile">
          <header className="admin-header">
            <h1 className="admin-header__title">{activeNavItem.label}</h1>
          </header>

          <main className="admin-content">
            {typeof children === "function" ? children(activeNavId, setActiveNavId) : children}
          </main>

          {toastMessage && (
            <div className="admin-toast" role="status" aria-live="polite">
              {toastMessage}
            </div>
          )}

          <nav className="admin-bottom-nav" aria-label="관리자 메뉴">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeNavId;

              return (
                <button
                  key={item.id}
                  className={`admin-bottom-nav__item${isActive ? " is-active" : ""}`}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => handleNavChange(item.id)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              className="admin-bottom-nav__item"
              type="button"
              aria-label="나가기"
              title="나가기"
              onClick={() => navigate("/")}
            >
              <AdminExitIcon />
              <span>나가기</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
