import {
  AdminCalendarIcon,
  AdminChevronDownIcon,
  AdminReservationIcon,
  AdminTeamIcon,
} from "../icons";
import type { AdminRoomFilter, AdminTeamFilter } from "./types";

type AdminReservationFiltersProps = {
  dateRange: string;
  teamFilter: AdminTeamFilter;
  roomFilter: AdminRoomFilter;
  onDateRangeChange: (value: string) => void;
  onTeamFilterChange: (value: AdminTeamFilter) => void;
  onRoomFilterChange: (value: AdminRoomFilter) => void;
};

const AdminReservationFilters = ({
  dateRange,
  teamFilter,
  roomFilter,
  onDateRangeChange,
  onTeamFilterChange,
  onRoomFilterChange,
}: AdminReservationFiltersProps) => {
  return (
    <div className="admin-reservation-filters" aria-label="예약 목록 조건">
      <label className="admin-select-chip">
        <AdminCalendarIcon />
        <select value={dateRange} onChange={(event) => onDateRangeChange(event.target.value)}>
          <option value="7">오늘~7일</option>
          <option value="14">오늘~14일</option>
          <option value="30">오늘~30일</option>
        </select>
        <AdminChevronDownIcon />
      </label>

      <label className="admin-select-chip">
        <AdminTeamIcon />
        <select
          value={teamFilter}
          onChange={(event) => onTeamFilterChange(event.target.value as AdminTeamFilter)}
        >
          <option value="all">팀 전체</option>
          <option value="team">팀 예약</option>
          <option value="private">개인 예약</option>
        </select>
        <AdminChevronDownIcon />
      </label>

      <label className="admin-select-chip">
        <AdminReservationIcon />
        <select
          value={roomFilter}
          onChange={(event) => onRoomFilterChange(event.target.value as AdminRoomFilter)}
        >
          <option value="all">룸 전체</option>
          <option value="A룸">A룸</option>
          <option value="B룸">B룸</option>
          <option value="C룸">C룸</option>
          <option value="D룸">D룸</option>
        </select>
        <AdminChevronDownIcon />
      </label>
    </div>
  );
};

export default AdminReservationFilters;
