import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPlusIcon } from "../icons";
import RefreshIcon from "../../common/icons/RefreshIcon";
import AdminCreateReservationModal from "./AdminCreateReservationModal";
import AdminReservationCard from "./AdminReservationCard";
import AdminReservationDetail from "./AdminReservationDetail";
import AdminReservationFilters from "./AdminReservationFilters";
import AdminReservationTabs from "./AdminReservationTabs";
import * as adminApi from "../../../apis/adminApi";
import type {
  AdminReservation,
  AdminReservationStatus,
  AdminRoomFilter,
  AdminTeamFilter,
  NewAdminReservation,
} from "./types";

type AdminReservationTeamOption = {
  id: number;
  name: string;
};

type AdminReservationPanelProps = {
  initialReservationId?: number | null;
  rooms?: string[];
  ownerTeamOptions?: AdminReservationTeamOption[];
  onInitialBack?: () => void;
  onOpenUser?: (userId: number) => void;
  onOpenTeam?: (teamId: number) => void;
  onToast?: (message: string) => void;
};


const AdminReservationPanel = ({
  initialReservationId = null,
  rooms = [],
  ownerTeamOptions = [],
  onInitialBack,
  onOpenUser,
  onOpenTeam,
  onToast,
}: AdminReservationPanelProps) => {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [pendingTotalCount, setPendingTotalCount] = useState(0);
  const [approvedTotalCount, setApprovedTotalCount] = useState(0);
  const [activeStatus, setActiveStatus] = useState<AdminReservationStatus>("pending");
  const [dateRange, setDateRange] = useState("0");
  const [teamFilter, setTeamFilter] = useState<AdminTeamFilter>("all");
  const [roomFilter, setRoomFilter] = useState<AdminRoomFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<AdminReservation | null>(null);

  const refreshReservations = useCallback(async () => {
    const data = await adminApi.getReservations({
      dateRange,
      teamFilter,
      roomFilter,
    });

    setReservations(data.reservations);
    setPendingTotalCount(data.pendingTotalCount);
    setApprovedTotalCount(data.approvedTotalCount);
    if (initialReservationId !== null) {
      setSelectedReservation(data.reservations.find((r) => r.id === initialReservationId) ?? null);
    }
  }, [dateRange, initialReservationId, roomFilter, teamFilter]);

  useEffect(() => {
    refreshReservations().catch(console.error);
    const intervalId = window.setInterval(() => {
      refreshReservations().catch(console.error);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [refreshReservations]);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);

    try {
      await refreshReservations();
    } catch (error) {
      console.error(error);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (reservation.status !== activeStatus) {
        return false;
      }

      return true;
    });
  }, [activeStatus, reservations]);

  const handleApprove = (id: number) => {
    adminApi.approveReservation(id).catch(console.error);
    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status: "approved" } : reservation,
      ),
    );
    setPendingTotalCount((currentCount) => Math.max(currentCount - 1, 0));
    setApprovedTotalCount((currentCount) => currentCount + 1);
    setSelectedReservation(null);
    onToast?.("예약을 승인했습니다.");
  };

  const handleReject = (id: number) => {
    const rejectedReservation = reservations.find((reservation) => reservation.id === id);

    adminApi.cancelReservation(id).catch(console.error);
    setReservations((currentReservations) =>
      currentReservations.filter((reservation) => reservation.id !== id),
    );
    if (rejectedReservation?.status === "pending") {
      setPendingTotalCount((currentCount) => Math.max(currentCount - 1, 0));
    }
    if (rejectedReservation?.status === "approved") {
      setApprovedTotalCount((currentCount) => Math.max(currentCount - 1, 0));
    }
    setSelectedReservation(null);
    onToast?.("예약을 취소했습니다.");
  };

  const handleRejectOccurrences = (id: number, canceledDates: string[]) => {
    adminApi.cancelOccurrences(id, canceledDates).catch(console.error);
    setReservations((currentReservations) =>
      currentReservations.map((reservation) => {
        if (reservation.id !== id) {
          return reservation;
        }

        const nextCanceledDates = Array.from(
          new Set([...(reservation.canceledOccurrenceDates ?? []), ...canceledDates]),
        );

        return {
          ...reservation,
          canceledOccurrenceDates: nextCanceledDates,
        };
      }),
    );

    setSelectedReservation((currentReservation) => {
      if (!currentReservation || currentReservation.id !== id) {
        return currentReservation;
      }

      return {
        ...currentReservation,
        canceledOccurrenceDates: Array.from(
          new Set([...(currentReservation.canceledOccurrenceDates ?? []), ...canceledDates]),
        ),
      };
    });
    onToast?.(`${canceledDates.length}개의 반복 예약을 취소했습니다.`);
  };

  const handleCreate = async (newReservation: NewAdminReservation, canceledConflictIds: number[] = []) => {
    const created = await adminApi.createReservation(newReservation, canceledConflictIds);
    setReservations((currentReservations) => [
      created,
      ...currentReservations.filter((reservation) => !canceledConflictIds.includes(reservation.id)),
    ]);
    setActiveStatus("approved");
    setIsCreateOpen(false);
    onToast?.(
      canceledConflictIds.length > 0
        ? "예약을 생성하고 충돌 예약을 취소했습니다."
        : "예약을 생성했습니다.",
    );
  };

  const handleCloseDetail = () => {
    setSelectedReservation(null);

    if (initialReservationId !== null) {
      onInitialBack?.();
    }
  };

  return (
    <section className="admin-reservation" aria-label="예약 관리">
      <div className="admin-reservation__topbar">
        <button
          className={[
            "admin-reservation__refresh-button",
            isManualRefreshing ? "is-refreshing" : "",
          ].filter(Boolean).join(" ")}
          type="button"
          onClick={() => void handleRefresh()}
          aria-label="예약 목록 새로고침"
          disabled={isManualRefreshing}
        >
          <RefreshIcon />
        </button>
      </div>
      <AdminReservationTabs
        activeStatus={activeStatus}
        pendingCount={pendingTotalCount}
        approvedCount={approvedTotalCount}
        onChange={setActiveStatus}
      />

      <div className="admin-panel-scroll">
        <div className="admin-reservation__toolbar">
          <AdminReservationFilters
            dateRange={dateRange}
            teamFilter={teamFilter}
            roomFilter={roomFilter}
            roomOptions={rooms}
            onDateRangeChange={setDateRange}
            onTeamFilterChange={setTeamFilter}
            onRoomFilterChange={setRoomFilter}
          />
        </div>

        <div className="admin-reservation__list-header">
          <h2 className="admin-reservation__section-title">
            {activeStatus === "pending" ? "승인 대기 예약" : "승인 완료 예약"}
          </h2>
          <button className="admin-create-button admin-create-button--inline" type="button" onClick={() => setIsCreateOpen(true)}>
            <AdminPlusIcon />
            예약 생성
          </button>
        </div>

        <div className="admin-reservation__list">
          {filteredReservations.length > 0 ? (
            filteredReservations.map((reservation) => (
              <AdminReservationCard
                key={reservation.id}
                reservation={reservation}
                onSelect={setSelectedReservation}
                onApprove={handleApprove}
              />
            ))
          ) : (
            <p className="admin-reservation__empty">조건에 맞는 예약이 없습니다.</p>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <AdminCreateReservationModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreate}
          rooms={rooms}
          teamOptions={ownerTeamOptions}
        />
      )}

      {selectedReservation && (
        <AdminReservationDetail
          reservation={selectedReservation}
          onBack={handleCloseDetail}
          onApprove={handleApprove}
          onReject={handleReject}
          onRejectOccurrences={handleRejectOccurrences}
          onOpenUser={onOpenUser}
          onOpenTeam={onOpenTeam}
        />
      )}
    </section>
  );
};

export default AdminReservationPanel;
