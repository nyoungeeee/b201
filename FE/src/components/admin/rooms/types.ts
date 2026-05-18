export type AdminPracticeRoom = {
  id: number;
  name: string;
  description: string;
  openTime: string;
  closeTime: string;
  isOpenAllDay: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type AdminRoomDayOffType = "휴무" | "점검" | "기타";

export type AdminRoomDayOff = {
  id: number;
  roomName: string;
  dateLabel: string;
  timeLabel: string;
  type: AdminRoomDayOffType;
  reason: string;
};

export type AdminRoomDayOffDraft = {
  targetType: "all" | "single";
  roomName: string;
  dateLabel: string;       // 점검/기타: 단일 날짜
  endDateLabel: string;    // 휴무: 종료 날짜
  type: AdminRoomDayOffType;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
};

export type AdminRoomAffectedReservation = {
  id: number;
  roomName: string;
  dateTime: string;
  reserver: string;
  status: "승인 완료" | "승인 대기";
};
