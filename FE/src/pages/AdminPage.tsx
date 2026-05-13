import { useState } from "react";

import AdminLayout from "../components/admin/AdminLayout";
import AdminReservationPanel from "../components/admin/reservations/AdminReservationPanel";
import AdminRoomPanel from "../components/admin/rooms/AdminRoomPanel";
import AdminUserPanel, { type AdminUserView } from "../components/admin/users/AdminUserPanel";

const AdminPage = () => {
  const [externalUserView, setExternalUserView] = useState<AdminUserView | null>(null);
  const [externalReservationId, setExternalReservationId] = useState<number | null>(null);
  const userPanelKey = externalUserView
    ? `${externalUserView.name}-${"userId" in externalUserView ? externalUserView.userId : ""}${"teamId" in externalUserView ? externalUserView.teamId : ""}`
    : "default";
  const reservationPanelKey = externalReservationId === null ? "default" : `reservation-${externalReservationId}`;

  return (
    <AdminLayout>
      {(activeNavId, setActiveNavId) => {
        return (
          <>
            <div className="admin-panel-slot" hidden={activeNavId !== "reservation"}>
              <AdminReservationPanel
                key={reservationPanelKey}
                initialReservationId={externalReservationId}
                onInitialBack={() => {
                  setExternalReservationId(null);
                  setActiveNavId("room");
                }}
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
              <AdminRoomPanel
                onOpenReservation={(reservationId) => {
                  setExternalReservationId(reservationId);
                  setActiveNavId("reservation");
                }}
              />
            </div>
          </>
        );
      }}
    </AdminLayout>
  );
};

export default AdminPage;
