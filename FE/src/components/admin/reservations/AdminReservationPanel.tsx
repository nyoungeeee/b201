import { useMemo, useState } from "react";

import { AdminPlusIcon } from "../icons";
import AdminCreateReservationModal from "./AdminCreateReservationModal";
import AdminReservationCard from "./AdminReservationCard";
import AdminReservationDetail from "./AdminReservationDetail";
import AdminReservationFilters from "./AdminReservationFilters";
import AdminReservationTabs from "./AdminReservationTabs";
import { mockAdminReservations } from "./mockReservations";
import type {
  AdminReservation,
  AdminReservationStatus,
  AdminRoomFilter,
  AdminTeamFilter,
  NewAdminReservation,
} from "./types";

type AdminReservationPanelProps = {
  onOpenUser?: (userId: number) => void;
  onOpenTeam?: (teamId: number) => void;
};

const formatCreatedDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${month}.${day} (${weekdays[parsedDate.getDay()]})`;
};

const AdminReservationPanel = ({ onOpenUser, onOpenTeam }: AdminReservationPanelProps) => {
  const [reservations, setReservations] = useState<AdminReservation[]>(mockAdminReservations);
  const [activeStatus, setActiveStatus] = useState<AdminReservationStatus>("pending");
  const [dateRange, setDateRange] = useState("7");
  const [teamFilter, setTeamFilter] = useState<AdminTeamFilter>("all");
  const [roomFilter, setRoomFilter] = useState<AdminRoomFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<AdminReservation | null>(null);

  const pendingCount = reservations.filter((reservation) => reservation.status === "pending").length;
  const approvedCount = reservations.filter((reservation) => {
    if (reservation.status !== "approved") {
      return false;
    }

    if (reservation.dayOffset > Number(dateRange)) {
      return false;
    }

    if (teamFilter === "team" && !reservation.teamName) {
      return false;
    }

    if (teamFilter === "private" && reservation.teamName) {
      return false;
    }

    if (roomFilter !== "all" && reservation.room !== roomFilter) {
      return false;
    }

    return true;
  }).length;

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (reservation.status !== activeStatus) {
        return false;
      }

      if (activeStatus === "approved" && reservation.dayOffset > Number(dateRange)) {
        return false;
      }

      if (activeStatus === "approved" && teamFilter === "team" && !reservation.teamName) {
        return false;
      }

      if (activeStatus === "approved" && teamFilter === "private" && reservation.teamName) {
        return false;
      }

      if (activeStatus === "approved" && roomFilter !== "all" && reservation.room !== roomFilter) {
        return false;
      }

      return true;
    });
  }, [activeStatus, dateRange, reservations, roomFilter, teamFilter]);

  const handleApprove = (id: number) => {
    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status: "approved" } : reservation,
      ),
    );
    setSelectedReservation(null);
  };

  const handleReject = (id: number) => {
    setReservations((currentReservations) =>
      currentReservations.filter((reservation) => reservation.id !== id),
    );
    setSelectedReservation(null);
  };

  const handleRejectOccurrences = (id: number, canceledDates: string[]) => {
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
  };

  const handleCreate = (newReservation: NewAdminReservation, canceledConflictIds: number[] = []) => {
    const nextReservation: AdminReservation = {
      id: Date.now(),
      status: "approved",
      kind: "single",
      dateLabel: formatCreatedDate(newReservation.date),
      dayOffset: 0,
      timeLabel: `${newReservation.startTime}~${newReservation.endTime}`,
      room: newReservation.room,
      reserverName: newReservation.title,
      memo: newReservation.memo,
    };

    setReservations((currentReservations) => [
      nextReservation,
      ...currentReservations.filter((reservation) => !canceledConflictIds.includes(reservation.id)),
    ]);
    setActiveStatus("approved");
    setIsCreateOpen(false);
  };

  return (
    <section className="admin-reservation" aria-label="예약 관리">
      <AdminReservationTabs
        activeStatus={activeStatus}
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        onChange={setActiveStatus}
      />

      <div className="admin-reservation__toolbar">
        <AdminReservationFilters
          dateRange={dateRange}
          teamFilter={teamFilter}
          roomFilter={roomFilter}
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

      {isCreateOpen && (
        <AdminCreateReservationModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {selectedReservation && (
        <AdminReservationDetail
          reservation={selectedReservation}
          onBack={() => setSelectedReservation(null)}
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
