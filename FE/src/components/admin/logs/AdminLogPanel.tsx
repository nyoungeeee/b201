import { useMemo, useState } from "react";

import {
  AdminArrowLeftIcon,
  AdminCalendarIcon,
  AdminChevronRightIcon,
  AdminMemoIcon,
  AdminReservationIcon,
  AdminRoomIcon,
  AdminStatusIcon,
  AdminTeamIcon,
  AdminUserIcon,
} from "../icons";
import AdminSelect from "../common/AdminSelect";

export type AdminLogCategory = "예약" | "사용자" | "팀" | "합주실" | "쉬는날";

export type AdminLogEntry = {
  id: number;
  category: AdminLogCategory;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
};

type AdminLogPanelProps = {
  logs: AdminLogEntry[];
};

type AdminLogPeriodFilter = "0" | "7" | "30" | "90" | "all";

const categoryOptions: Array<"all" | AdminLogCategory> = [
  "all",
  "예약",
  "사용자",
  "팀",
  "합주실",
  "쉬는날",
];

const periodOptions = [
  { value: "0", label: "오늘" },
  { value: "7", label: "이전 일주일" },
  { value: "30", label: "한달" },
  { value: "90", label: "3달" },
  { value: "all", label: "전체 보기" },
] as const;

const getLogIcon = (category: AdminLogCategory) => {
  switch (category) {
    case "예약":
      return AdminReservationIcon;
    case "사용자":
      return AdminUserIcon;
    case "팀":
      return AdminTeamIcon;
    case "합주실":
      return AdminRoomIcon;
    case "쉬는날":
      return AdminCalendarIcon;
    default:
      return AdminMemoIcon;
  }
};

const AdminLogPanel = ({ logs }: AdminLogPanelProps) => {
  const [periodFilter, setPeriodFilter] = useState<AdminLogPeriodFilter>("0");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AdminLogCategory>("all");
  const [selectedLog, setSelectedLog] = useState<AdminLogEntry | null>(null);
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (categoryFilter !== "all" && log.category !== categoryFilter) {
        return false;
      }

      if (periodFilter === "all") {
        return true;
      }

      const [datePart] = log.createdAt.split(" ");
      const logTime = new Date(`${datePart.replaceAll(".", "-")}T00:00:00`).getTime();
      const today = new Date("2026-05-18T00:00:00").getTime();
      const diffDays = Math.floor((today - logTime) / 86400000);

      if (periodFilter === "0") {
        return diffDays === 0;
      }

      return diffDays >= 0 && diffDays <= Number(periodFilter);
    });
  }, [categoryFilter, logs, periodFilter]);

  if (selectedLog) {
    return (
      <section className="admin-sub-screen">
        <header className="admin-sub-screen__header">
          <button type="button" aria-label="뒤로가기" onClick={() => setSelectedLog(null)}>
            <AdminArrowLeftIcon />
          </button>
          <h2>기록 상세</h2>
        </header>
        <div className="admin-sub-screen__content">
          <section className="admin-log-detail-card">
            <span>{selectedLog.category}</span>
            <h3>{selectedLog.action}</h3>
            <p>{selectedLog.detail}</p>
          </section>
          <section className="admin-room-info-card">
            <h3>기본 정보</h3>
            {[
              ["대상", selectedLog.target],
              ["분류", selectedLog.category],
              ["일시", selectedLog.createdAt],
              ["처리자", "사장님"],
            ].map(([label, value]) => (
              <p key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </section>
          <div className="admin-info-box">
            <AdminMemoIcon />
            <p>이 화면은 기록 확인용입니다. 취소, 복구, 재처리 같은 동작은 제공하지 않습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-logs" aria-label="기록보기">
      <div className="admin-panel-scroll">
        <div className="admin-log-filters">
          <AdminSelect
            value={periodFilter}
            icon={<AdminCalendarIcon />}
            options={[...periodOptions]}
            onChange={setPeriodFilter}
          />
          <AdminSelect<"all" | AdminLogCategory>
            value={categoryFilter}
            icon={<AdminStatusIcon />}
            options={categoryOptions.map((category) => ({
              value: category,
              label: category === "all" ? "전체 분류" : category,
            }))}
            onChange={setCategoryFilter}
          />
        </div>

        <div className="admin-log-list">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const LogIcon = getLogIcon(log.category);

              return (
                <button className="admin-log-card" key={log.id} type="button" onClick={() => setSelectedLog(log)}>
                  <LogIcon />
                  <div>
                    <span>{log.category}</span>
                    <strong>{log.action}</strong>
                    <p>{log.target}</p>
                  </div>
                  <time>{log.createdAt}</time>
                  <AdminChevronRightIcon />
                </button>
              );
            })
          ) : (
            <p className="admin-reservation__empty">기록이 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminLogPanel;
