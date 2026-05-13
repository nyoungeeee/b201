import type { AdminReservationStatus } from "./types";

type AdminReservationTabsProps = {
  activeStatus: AdminReservationStatus;
  pendingCount: number;
  approvedCount: number;
  onChange: (status: AdminReservationStatus) => void;
};

const AdminReservationTabs = ({
  activeStatus,
  pendingCount,
  approvedCount,
  onChange,
}: AdminReservationTabsProps) => {
  return (
    <div className="admin-reservation-tabs" role="tablist" aria-label="예약 상태">
      <button
        className={`admin-reservation-tabs__item${activeStatus === "pending" ? " is-active" : ""}`}
        type="button"
        role="tab"
        aria-selected={activeStatus === "pending"}
        onClick={() => onChange("pending")}
      >
        승인 대기 {pendingCount}
      </button>
      <button
        className={`admin-reservation-tabs__item${activeStatus === "approved" ? " is-active" : ""}`}
        type="button"
        role="tab"
        aria-selected={activeStatus === "approved"}
        onClick={() => onChange("approved")}
      >
        승인 완료 {approvedCount}
      </button>
    </div>
  );
};

export default AdminReservationTabs;
