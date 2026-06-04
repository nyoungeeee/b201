import { useCallback, useEffect, useState } from "react";

import AdminLayout from "../components/admin/AdminLayout";
import AdminLogPanel, {
  type AdminLogCategory,
  type AdminLogEntry,
} from "../components/admin/logs/AdminLogPanel";
import AdminReservationPanel from "../components/admin/reservations/AdminReservationPanel";
import AdminRoomPanel from "../components/admin/rooms/AdminRoomPanel";
import AdminUserPanel, { type AdminUserView } from "../components/admin/users/AdminUserPanel";
import * as adminApi from "../apis/adminApi";

const inferLogCategory = (message: string): AdminLogCategory => {
  if (message.includes("예약")) {
    return "예약";
  }

  if (message.includes("사용자") || message.includes("블록")) {
    return "사용자";
  }

  if (message.includes("팀")) {
    return "팀";
  }

  if (message.includes("쉬는날")) {
    return "쉬는날";
  }

  return "합주실";
};

const formatLogTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${hour}:${minute}`;
};

const AdminLogPanelLoader = ({
  logs,
  onLogsChange,
}: {
  logs: AdminLogEntry[];
  onLogsChange: (
    logs: AdminLogEntry[] | ((currentLogs: AdminLogEntry[]) => AdminLogEntry[]),
  ) => void;
}) => {
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    let isActive = true;

    adminApi.getLogs()
      .then((nextLogs) => {
        if (isActive) onLogsChange(nextLogs);
      })
      .catch(console.error)
      .finally(() => {
        if (isActive) setIsLoadingLogs(false);
      });

    return () => {
      isActive = false;
    };
  }, [onLogsChange]);

  return <AdminLogPanel logs={logs} isLoading={isLoadingLogs} />;
};

const AdminPage = () => {
  const [externalUserView, setExternalUserView] = useState<AdminUserView | null>(null);
  const [externalReservationId, setExternalReservationId] = useState<number | null>(null);
  const [navResetKey, setNavResetKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const userPanelKey = externalUserView
    ? `${externalUserView.name}-${"userId" in externalUserView ? externalUserView.userId : ""}${"teamId" in externalUserView ? externalUserView.teamId : ""}`
    : `default-${navResetKey}`;
  const reservationPanelKey = externalReservationId === null ? `default-${navResetKey}` : `reservation-${externalReservationId}`;
  const roomPanelKey = `room-${navResetKey}`;

  const showToast = (message: string) => {
    setToastMessage(null);
    window.setTimeout(() => setToastMessage(message), 0);
    setLogs((currentLogs) => [
      {
        id: Date.now(),
        category: inferLogCategory(message),
        action: message.replace(/\.$/, ""),
        target: "관리자 화면",
        detail: message,
        createdAt: formatLogTime(),
      },
      ...currentLogs,
    ]);
  };

  const handleLogsChange = useCallback(
    (nextLogs: AdminLogEntry[] | ((currentLogs: AdminLogEntry[]) => AdminLogEntry[])) => {
      setLogs(nextLogs);
    },
    [],
  );

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setToastMessage(null), 2200);

    return () => window.clearTimeout(timerId);
  }, [toastMessage]);

  return (
    <AdminLayout
      toastMessage={toastMessage}
      onNavChange={() => {
        setExternalUserView(null);
        setExternalReservationId(null);
        setNavResetKey((currentKey) => currentKey + 1);
      }}
    >
      {(activeNavId, setActiveNavId) => (
        <>
          {activeNavId === "reservation" && (
            <div className="admin-panel-slot">
              <AdminReservationPanel
                key={reservationPanelKey}
                initialReservationId={externalReservationId}
                isActive={activeNavId === "reservation"}
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
                onToast={showToast}
              />
            </div>
          )}
          {activeNavId === "user" && (
            <div className="admin-panel-slot">
              <AdminUserPanel
                key={userPanelKey}
                initialView={externalUserView}
                onToast={showToast}
                onInitialBack={() => {
                  setExternalUserView(null);
                  setActiveNavId("reservation");
                }}
              />
            </div>
          )}
          {activeNavId === "room" && (
            <div className="admin-panel-slot">
              <AdminRoomPanel
                key={roomPanelKey}
                onOpenReservation={(reservationId) => {
                  setExternalReservationId(reservationId);
                  setActiveNavId("reservation");
                }}
                onToast={showToast}
              />
            </div>
          )}
          {activeNavId === "log" && (
            <div className="admin-panel-slot">
              <AdminLogPanelLoader logs={logs} onLogsChange={handleLogsChange} />
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default AdminPage;
