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
    <div
      className="admin-reservation-tabs"
      role="tablist"
      aria-label="예약 상태"
    >
      <button
        className={`admin-reservation-tabs__item${activeStatus === "pending" ? " is-active" : ""}`}
        type="button"
        role="tab"
        aria-selected="true"
        onClick={() => onChange("pending")}
        hidden={activeStatus !== "pending" ? true : undefined}
      >
        승인 대기 {pendingCount}
      </button>
      {activeStatus !== "pending" && (
        <button
          className="admin-reservation-tabs__item"
          type="button"
          role="tab"
          aria-selected="false"
          onClick={() => onChange("pending")}
        >
          승인 대기 {pendingCount}
        </button>
      )}
      <button
        className={`admin-reservation-tabs__item${activeStatus === "approved" ? " is-active" : ""}`}
        type="button"
        role="tab"
        aria-selected="true"
        onClick={() => onChange("approved")}
        hidden={activeStatus !== "approved" ? true : undefined}
      >
        승인 완료 {approvedCount}
      </button>
      {activeStatus !== "approved" && (
        <button
          className="admin-reservation-tabs__item"
          type="button"
          role="tab"
          aria-selected="false"
          onClick={() => onChange("approved")}
        >
          승인 완료 {approvedCount}
        </button>
      )}
    </div>
  );
};

export default AdminReservationTabs;
