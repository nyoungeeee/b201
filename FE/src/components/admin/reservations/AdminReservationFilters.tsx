import {
  AdminCalendarIcon,
  AdminReservationIcon,
  AdminTeamIcon,
} from "../icons";
import AdminSelect from "../common/AdminSelect";
import type { AdminRoomFilter, AdminTeamFilter } from "./types";

type AdminReservationFiltersProps = {
  dateRange: string;
  teamFilter: AdminTeamFilter;
  roomFilter: AdminRoomFilter;
  roomOptions: string[];
  onDateRangeChange: (value: string) => void;
  onTeamFilterChange: (value: AdminTeamFilter) => void;
  onRoomFilterChange: (value: AdminRoomFilter) => void;
};

const AdminReservationFilters = ({
  dateRange,
  teamFilter,
  roomFilter,
  roomOptions,
  onDateRangeChange,
  onTeamFilterChange,
  onRoomFilterChange,
}: AdminReservationFiltersProps) => {
  return (
    <div className="admin-reservation-filters" aria-label="예약 목록 조건">
      <AdminSelect
        value={dateRange}
        icon={<AdminCalendarIcon />}
        options={[
          { value: "7", label: "오늘~7일" },
          { value: "14", label: "오늘~14일" },
          { value: "30", label: "오늘~30일" },
        ]}
        onChange={onDateRangeChange}
      />

      <AdminSelect<AdminTeamFilter>
        value={teamFilter}
        icon={<AdminTeamIcon />}
        options={[
          { value: "all", label: "팀 전체" },
          { value: "team", label: "팀 예약" },
          { value: "private", label: "개인 예약" },
        ]}
        onChange={onTeamFilterChange}
      />

      <AdminSelect<AdminRoomFilter>
        value={roomFilter}
        icon={<AdminReservationIcon />}
        options={[
          { value: "all", label: "룸 전체" },
          ...roomOptions.map((roomName) => ({ value: roomName, label: roomName })),
        ]}
        onChange={onRoomFilterChange}
      />
    </div>
  );
};

export default AdminReservationFilters;
