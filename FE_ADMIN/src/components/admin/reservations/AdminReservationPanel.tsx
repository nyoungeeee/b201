import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  AdminActiveReservationStatus,
  AdminReservationRoomOption,
  AdminRoomFilter,
  AdminTeamFilter,
  NewAdminReservation,
} from "./types";
import type { AdminPracticeRoom } from "../rooms/types";

type AdminReservationTeamOption = {
  id: number;
  name: string;
};

type AdminReservationPanelProps = {
  initialReservationId?: number | null;
  isActive?: boolean;
  onInitialBack?: () => void;
  onOpenUser?: (userId: number) => void;
  onOpenTeam?: (teamId: number) => void;
  onToast?: (message: string) => void;
};

const RESERVATION_PAGE_SIZE = 10;
const CREATE_TEAM_OPTION_PAGE_SIZE = 10;

const INITIAL_PAGE_STATE: Record<AdminActiveReservationStatus, number> = {
  pending: 1,
  approved: 1,
};

const INITIAL_HAS_NEXT_STATE: Record<AdminActiveReservationStatus, boolean> = {
  pending: false,
  approved: false,
};

const sortReservations = (items: AdminReservation[]) => (
  [...items].sort((leftReservation, rightReservation) => {
    if (leftReservation.dayOffset !== rightReservation.dayOffset) {
      return leftReservation.dayOffset - rightReservation.dayOffset;
    }

    return leftReservation.timeLabel.localeCompare(rightReservation.timeLabel);
  })
);

const mergeReservations = (
  currentReservations: AdminReservation[],
  nextReservations: AdminReservation[],
  replace = false,
) => {
  const reservationMap = new Map<number, AdminReservation>();

  if (!replace) {
    currentReservations.forEach((reservation) => {
      reservationMap.set(reservation.id, reservation);
    });
  }

  nextReservations.forEach((reservation) => {
    reservationMap.set(reservation.id, reservation);
  });

  return sortReservations(Array.from(reservationMap.values()));
};

const mergeTeamOptions = (
  currentTeams: AdminReservationTeamOption[],
  nextTeams: AdminReservationTeamOption[],
) => {
  const teamMap = new Map(currentTeams.map((team) => [team.id, team]));

  nextTeams.forEach((team) => teamMap.set(team.id, team));

  return Array.from(teamMap.values());
};

const toActiveRooms = (rooms: AdminPracticeRoom[]) => (
  rooms
    .filter((room) => room.isActive)
    .sort((leftRoom, rightRoom) => leftRoom.sortOrder - rightRoom.sortOrder)
);

const AdminReservationPanel = ({
  initialReservationId = null,
  isActive = true,
  onInitialBack,
  onOpenUser,
  onOpenTeam,
  onToast,
}: AdminReservationPanelProps) => {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [pendingTotalCount, setPendingTotalCount] = useState(0);
  const [approvedTotalCount, setApprovedTotalCount] = useState(0);
  const [activeStatus, setActiveStatus] = useState<AdminActiveReservationStatus>("pending");
  const [dateRange, setDateRange] = useState("0");
  const [teamFilter, setTeamFilter] = useState<AdminTeamFilter>("all");
  const [roomFilter, setRoomFilter] = useState<AdminRoomFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rooms, setRooms] = useState<AdminPracticeRoom[]>([]);
  const [ownerTeamOptions, setOwnerTeamOptions] = useState<AdminReservationTeamOption[]>([]);
  const [ownerTeamPage, setOwnerTeamPage] = useState(1);
  const [hasNextOwnerTeams, setHasNextOwnerTeams] = useState(false);
  const [isLoadingCreateOptions, setIsLoadingCreateOptions] = useState(false);
  const [isLoadingMoreOwnerTeams, setIsLoadingMoreOwnerTeams] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [isLoadingMoreReservations, setIsLoadingMoreReservations] = useState(false);
  const [loadedPages, setLoadedPages] =
    useState<Record<AdminActiveReservationStatus, number>>(INITIAL_PAGE_STATE);
  const [hasNextPage, setHasNextPage] =
    useState<Record<AdminActiveReservationStatus, boolean>>(INITIAL_HAS_NEXT_STATE);
  const [selectedReservation, setSelectedReservation] = useState<AdminReservation | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const roomOptions = useMemo(
    () => rooms.map((room) => room.name),
    [rooms],
  );
  const createRoomOptions: AdminReservationRoomOption[] = useMemo(
    () => rooms.map((room) => ({ name: room.name, openTime: room.openTime })),
    [rooms],
  );

  useEffect(() => {
    let isActive = true;

    adminApi.getRooms()
      .then((nextRooms) => {
        if (!isActive) return;

        setRooms(toActiveRooms(nextRooms));
      })
      .catch(console.error);

    return () => {
      isActive = false;
    };
  }, []);

  const refreshReservations = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoadingReservations(true);
    }

    try {
      const data = await adminApi.getReservations({
        dateRange,
        teamFilter,
        roomFilter,
        pendingPage: 1,
        approvedPage: 1,
        pageSize: RESERVATION_PAGE_SIZE,
      });

      setReservations(mergeReservations([], data.reservations, true));
      setPendingTotalCount(data.pendingTotalCount);
      setApprovedTotalCount(data.approvedTotalCount);
      setLoadedPages(INITIAL_PAGE_STATE);
      setHasNextPage({
        pending: data.pendingHasNext,
        approved: data.approvedHasNext,
      });
      if (initialReservationId !== null) {
        setSelectedReservation(data.reservations.find((r) => r.id === initialReservationId) ?? null);
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingReservations(false);
      }
    }
  }, [dateRange, initialReservationId, roomFilter, teamFilter]);

  useEffect(() => {
    refreshReservations().catch((error) => {
      console.error(error);
      setIsLoadingReservations(false);
    });
  }, [refreshReservations]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      const canAutoRefresh =
        isActive &&
        loadedPages[activeStatus] === 1 &&
        scrollTop < 80 &&
        !isLoadingReservations &&
        !isLoadingMoreReservations &&
        !selectedReservation;

      if (canAutoRefresh) {
        refreshReservations({ silent: true }).catch(console.error);
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [
    activeStatus,
    isActive,
    isLoadingMoreReservations,
    isLoadingReservations,
    loadedPages,
    refreshReservations,
    selectedReservation,
  ]);

  const loadMoreReservations = useCallback(async () => {
    if (isLoadingReservations || isLoadingMoreReservations || !hasNextPage[activeStatus]) {
      return;
    }

    const nextPages = {
      ...loadedPages,
      [activeStatus]: loadedPages[activeStatus] + 1,
    };

    setIsLoadingMoreReservations(true);

    try {
      const data = await adminApi.getReservations({
        dateRange,
        teamFilter,
        roomFilter,
        pendingPage: nextPages.pending,
        approvedPage: nextPages.approved,
        pageSize: RESERVATION_PAGE_SIZE,
      });

      setReservations((currentReservations) =>
        mergeReservations(currentReservations, data.reservations),
      );
      setPendingTotalCount(data.pendingTotalCount);
      setApprovedTotalCount(data.approvedTotalCount);
      setLoadedPages(nextPages);
      setHasNextPage({
        pending: data.pendingHasNext,
        approved: data.approvedHasNext,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMoreReservations(false);
    }
  }, [
    activeStatus,
    dateRange,
    hasNextPage,
    isLoadingMoreReservations,
    isLoadingReservations,
    loadedPages,
    roomFilter,
    teamFilter,
  ]);

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
  const shouldShowListEnd =
    filteredReservations.length > 0 &&
    !hasNextPage[activeStatus] &&
    !isLoadingReservations &&
    !isLoadingMoreReservations;

  const handleReservationScroll = () => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) return;

    const distanceToBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight;

    if (distanceToBottom < 120) {
      void loadMoreReservations();
    }
  };

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

  const handleOpenCreate = async () => {
    if (ownerTeamOptions.length > 0) {
      setIsCreateOpen(true);
      return;
    }

    setIsLoadingCreateOptions(true);

    try {
      const [teams, nextRooms] = await Promise.all([
        ownerTeamOptions.length > 0
          ? Promise.resolve(null)
          : adminApi.getTeamsPage({ page: 1, pageSize: CREATE_TEAM_OPTION_PAGE_SIZE }),
        rooms.length > 0 ? Promise.resolve(null) : adminApi.getRooms(),
      ]);

      if (teams) {
        setOwnerTeamOptions(teams.teams.map((team) => ({ id: team.id, name: team.name })));
        setOwnerTeamPage(1);
        setHasNextOwnerTeams(teams.hasNext);
      }

      if (nextRooms) {
        setRooms(toActiveRooms(nextRooms));
      }

      setIsCreateOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingCreateOptions(false);
    }
  };

  const handleLoadMoreOwnerTeams = async () => {
    if (isLoadingMoreOwnerTeams || !hasNextOwnerTeams) {
      return;
    }

    const nextPage = ownerTeamPage + 1;
    setIsLoadingMoreOwnerTeams(true);

    try {
      const result = await adminApi.getTeamsPage({
        page: nextPage,
        pageSize: CREATE_TEAM_OPTION_PAGE_SIZE,
      });

      setOwnerTeamOptions((currentTeams) =>
        mergeTeamOptions(
          currentTeams,
          result.teams.map((team) => ({ id: team.id, name: team.name })),
        ),
      );
      setOwnerTeamPage(nextPage);
      setHasNextOwnerTeams(result.hasNext);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMoreOwnerTeams(false);
    }
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

      <div
        className="admin-panel-scroll"
        ref={scrollContainerRef}
        onScroll={handleReservationScroll}
      >
        <div className="admin-reservation__toolbar">
          <AdminReservationFilters
            dateRange={dateRange}
            teamFilter={teamFilter}
            roomFilter={roomFilter}
            roomOptions={roomOptions}
            onDateRangeChange={setDateRange}
            onTeamFilterChange={setTeamFilter}
            onRoomFilterChange={setRoomFilter}
          />
        </div>

        <div className="admin-reservation__list-header">
          <h2 className="admin-reservation__section-title">
            {activeStatus === "pending" ? "승인 대기 예약" : "승인 완료 예약"}
          </h2>
          <button className="admin-create-button admin-create-button--inline" type="button" onClick={() => void handleOpenCreate()} disabled={isLoadingCreateOptions}>
            <AdminPlusIcon />
            {isLoadingCreateOptions ? "불러오는 중" : "예약 생성"}
          </button>
        </div>

        <div className="admin-reservation__list">
          {isLoadingReservations ? (
            <div className="admin-reservation-list-loading" role="status" aria-live="polite">
              <div className="admin-reservation-list-loading__spinner" aria-hidden="true" />
              <p>예약 목록을 불러오고 있어요</p>
            </div>
          ) : filteredReservations.length > 0 ? (
            <>
              {filteredReservations.map((reservation, index) => (
                <AdminReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  index={index}
                  onSelect={setSelectedReservation}
                  onApprove={handleApprove}
                />
              ))}
              {isLoadingMoreReservations && (
                <div className="admin-reservation-list-loading admin-reservation-list-loading--compact" role="status" aria-live="polite">
                  <div className="admin-reservation-list-loading__spinner" aria-hidden="true" />
                  <p>예약 목록을 더 불러오고 있어요</p>
                </div>
              )}
              {shouldShowListEnd && (
                <p className="admin-list-end">모든 목록을 조회했습니다.</p>
              )}
            </>
          ) : (
            <p className="admin-reservation__empty">조건에 맞는 예약이 없습니다.</p>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <AdminCreateReservationModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreate}
          rooms={createRoomOptions}
          teamOptions={ownerTeamOptions}
          hasMoreTeamOptions={hasNextOwnerTeams}
          isLoadingTeamOptions={isLoadingMoreOwnerTeams}
          onLoadMoreTeamOptions={handleLoadMoreOwnerTeams}
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
