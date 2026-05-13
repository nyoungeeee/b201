import { useState } from "react";

import AdminLayout from "../components/admin/AdminLayout";
import AdminReservationPanel from "../components/admin/reservations/AdminReservationPanel";
import AdminUserPanel, { type AdminUserView } from "../components/admin/users/AdminUserPanel";

const AdminPage = () => {
  const [externalUserView, setExternalUserView] = useState<AdminUserView | null>(null);
  const userPanelKey = externalUserView
    ? `${externalUserView.name}-${"userId" in externalUserView ? externalUserView.userId : ""}${"teamId" in externalUserView ? externalUserView.teamId : ""}`
    : "default";

  return (
    <AdminLayout>
      {(activeNavId, setActiveNavId) => {
        return (
          <>
            <div className="admin-panel-slot" hidden={activeNavId !== "reservation"}>
              <AdminReservationPanel
                onOpenUser={(userId) => {
                  setExternalUserView({ name: "user-detail", userId });
                  setActiveNavId("user");
                }}
                onOpenTeam={(teamId) => {
                  setExternalUserView({ name: "team-detail", teamId });
                  setActiveNavId("user");
                }}
              />
            </div>
            <div className="admin-panel-slot" hidden={activeNavId !== "user"}>
            <AdminUserPanel
              key={userPanelKey}
              initialView={externalUserView}
              onInitialBack={() => {
                setExternalUserView({ name: "list" });
                setActiveNavId("reservation");
              }}
            />
            </div>
            <div className="admin-panel-slot" hidden={activeNavId !== "room"}>
              <section className="admin-page admin-page-empty">합주실 관리는 준비 중입니다.</section>
            </div>
          </>
        );
      }}
    </AdminLayout>
  );
};

export default AdminPage;
