export type AdminReservationStatus = "pending" | "approved";
export type AdminReservationKind = "single" | "repeat";
export type AdminRoom = "A룸" | "B룸" | "C룸" | "D룸";
export type AdminTeamFilter = "all" | "team" | "private";
export type AdminRoomFilter = "all" | AdminRoom;

export type AdminReservation = {
  id: number;
  status: AdminReservationStatus;
  kind: AdminReservationKind;
  dateLabel: string;
  dayOffset: number;
  timeLabel: string;
  periodLabel?: string;
  room: AdminRoom;
  teamId?: number;
  teamName?: string;
  reserverUserId?: number;
  reserverName: string;
  memo?: string;
  canceledOccurrenceDates?: string[];
};

export type NewAdminReservation = {
  date: string;
  startTime: string;
  endTime: string;
  room: AdminRoom;
  title: string;
  memo: string;
};

export type AdminReservationConflict = {
  id: number;
  room: AdminRoom;
  date: string;
  timeLabel: string;
  ownerLabel: string;
  status: AdminReservationStatus;
};
