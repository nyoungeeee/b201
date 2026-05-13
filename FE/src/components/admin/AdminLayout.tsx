import { useState, type ReactNode } from "react";

import {
  AdminReservationIcon,
  AdminRoomIcon,
  AdminUserIcon,
} from "./icons";

type AdminLayoutProps = {
  children?: ReactNode | ((activeNavId: AdminNavId, setActiveNavId: (navId: AdminNavId) => void) => ReactNode);
};

const adminNavItems = [
  { id: "reservation", label: "예약 관리", icon: AdminReservationIcon },
  { id: "user", label: "사용자 관리", icon: AdminUserIcon },
  { id: "room", label: "합주실 관리", icon: AdminRoomIcon },
] as const;

export type AdminNavId = (typeof adminNavItems)[number]["id"];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [activeNavId, setActiveNavId] = useState<AdminNavId>(adminNavItems[0].id);
  const activeNavItem = adminNavItems.find((item) => item.id === activeNavId) ?? adminNavItems[0];

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
                  onClick={() => setActiveNavId(item.id)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
