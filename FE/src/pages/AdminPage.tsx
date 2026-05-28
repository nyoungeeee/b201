import { useEffect, useState } from "react";

import AdminLayout from "../components/admin/AdminLayout";
import AdminLogPanel, {
  type AdminLogCategory,
  type AdminLogEntry,
} from "../components/admin/logs/AdminLogPanel";
import AdminReservationPanel from "../components/admin/reservations/AdminReservationPanel";
import AdminRoomPanel from "../components/admin/rooms/AdminRoomPanel";
import type { AdminPracticeRoom } from "../components/admin/rooms/types";
import AdminUserPanel, { type AdminUserView } from "../components/admin/users/AdminUserPanel";
import * as adminApi from "../apis/adminApi";

const initialAdminLogs: AdminLogEntry[] = [
  {
    id: 1,
    category: "예약",
    action: "예약 승인",
    target: "B201 2026.05.08 19:00~21:00",
    detail: "승인 대기 예약을 승인 완료로 변경했습니다.",
    createdAt: "2026.05.18 10:12",
  },
  {
    id: 2,
    category: "팀",
    action: "팀 생성",
    target: "A팀",
    detail: "관리자가 팀을 생성하고 리더를 지정했습니다.",
    createdAt: "2026.05.18 10:04",
  },
  {
    id: 3,
    category: "합주실",
    action: "합주실 수정",
    target: "B201",
    detail: "운영 시간과 활성 상태 정보를 수정했습니다.",
    createdAt: "2026.05.18 09:48",
  },
];

const inferLogCategory = (message: string): AdminLogCategory => {
  if (message.includes("예약")) {
    return "예약";
  }

  if (message.includes("사용자") || message.includes("블락")) {
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

const AdminLoadingState = () => (
  <div className="admin-loading-state" role="status" aria-live="polite">
    <div className="admin-loading-state__spinner" aria-hidden="true" />
    <p>관리자 데이터를 불러오고 있어요</p>
  </div>
);

const AdminPage = () => {
  const [externalUserView, setExternalUserView] = useState<AdminUserView | null>(null);
  const [externalReservationId, setExternalReservationId] = useState<number | null>(null);
  const [navResetKey, setNavResetKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rooms, setRooms] = useState<AdminPracticeRoom[]>([]);
  const [ownerTeamOptions, setOwnerTeamOptions] = useState<{ id: number; name: string }[]>([]);
  const [logs, setLogs] = useState<AdminLogEntry[]>(initialAdminLogs);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(true);
  const userPanelKey = externalUserView
    ? `${externalUserView.name}-${"userId" in externalUserView ? externalUserView.userId : ""}${"teamId" in externalUserView ? externalUserView.teamId : ""}`
    : `default-${navResetKey}`;
  const reservationPanelKey = externalReservationId === null ? `default-${navResetKey}` : `reservation-${externalReservationId}`;
  const roomPanelKey = `room-${navResetKey}`;
  const activeRooms = rooms
    .filter((room) => room.isActive)
    .sort((leftRoom, rightRoom) => leftRoom.sortOrder - rightRoom.sortOrder);
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

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      adminApi.getRooms().then((nextRooms) => {
        if (isActive) setRooms(nextRooms);
      }),
      adminApi.getTeams().then((teams) => {
        if (isActive) {
          setOwnerTeamOptions(teams.map((team) => ({ id: team.id, name: team.name })));
        }
      }),
      adminApi.getLogs().then((nextLogs) => {
        if (isActive) setLogs(nextLogs);
      }),
    ])
      .then((results) => {
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error(result.reason);
          }
        });
      })
      .finally(() => {
        if (isActive) setIsLoadingAdminData(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

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
      {(activeNavId, setActiveNavId) => {
        return (
          <>
            {isLoadingAdminData ? (
              <AdminLoadingState />
            ) : (
              <>
                <div className="admin-panel-slot" hidden={activeNavId !== "reservation"}>
                  <AdminReservationPanel
                    key={reservationPanelKey}
                    initialReservationId={externalReservationId}
                    rooms={activeRooms}
                    ownerTeamOptions={ownerTeamOptions}
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
                <div className="admin-panel-slot" hidden={activeNavId !== "user"}>
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
                <div className="admin-panel-slot" hidden={activeNavId !== "room"}>
                  <AdminRoomPanel
                    key={roomPanelKey}
                    rooms={rooms}
                    onRoomsChange={setRooms}
                    onOpenReservation={(reservationId) => {
                      setExternalReservationId(reservationId);
                      setActiveNavId("reservation");
                    }}
                    onToast={showToast}
                  />
                </div>
                <div className="admin-panel-slot" hidden={activeNavId !== "log"}>
                  <AdminLogPanel logs={logs} isLoading={isLoadingAdminData} />
                </div>
              </>
            )}
          </>
        );
      }}
    </AdminLayout>
  );
};

export default AdminPage;
