import type {
  AdminPracticeRoom,
  AdminRoomAffectedReservation,
  AdminRoomDayOff,
  AdminRoomDayOffDraft,
} from "./types";

export const mockAdminPracticeRooms: AdminPracticeRoom[] = [
  {
    id: 1,
    name: "B201",
    description: "드럼/밴드 합주에 적합한 기본 합주실",
    openTime: "9:00",
    closeTime: "23:00",
    isOpenAllDay: false,
    isActive: true,
    sortOrder: 1,
    updatedAt: "2026.05.08",
  },
  {
    id: 2,
    name: "B203",
    description: "보컬 연습 중심의 소형 합주실",
    openTime: "0:00",
    closeTime: "24:00",
    isOpenAllDay: true,
    isActive: true,
    sortOrder: 2,
    updatedAt: "2026.05.08",
  },
];

export const mockAdminRoomDayOffs: AdminRoomDayOff[] = [
  {
    id: 1,
    roomName: "B201",
    dateLabel: "2026.5.20 (수)",
    timeLabel: "하루전체",
    type: "휴무",
    reason: "임시 휴무",
  },
  {
    id: 2,
    roomName: "전체 합주실",
    dateLabel: "2026.5.22 (금)",
    timeLabel: "9:00~11:00",
    type: "점검",
    reason: "전기 점검",
  },
  {
    id: 3,
    roomName: "N203",
    dateLabel: "2026.5.23 (금)",
    timeLabel: "9:00~11:00",
    type: "기타",
    reason: "사장님 개인 이슈",
  },
];

export const mockAffectedReservations: AdminRoomAffectedReservation[] = [
  {
    id: 5,
    roomName: "B201",
    dateTime: "2026.05.15 (금) 10:00~12:00",
    reserver: "팀: 사운드웨이브",
    status: "승인 완료",
  },
  {
    id: 1,
    roomName: "B203",
    dateTime: "2026.05.15 (금) 13:00~15:00",
    reserver: "개인 예약: 박지훈",
    status: "승인 대기",
  },
  {
    id: 7,
    roomName: "B201",
    dateTime: "2026.05.15 (금) 17:00~18:00",
    reserver: "팀: 블루코드",
    status: "승인 완료",
  },
];

export const mockCheckRoomDayOffConflicts = async (
  draft: AdminRoomDayOffDraft,
): Promise<AdminRoomAffectedReservation[]> => {
  const [year, month, day] = draft.dateLabel.split(".").map((datePart) => Number(datePart));
  const normalizedDate = `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;

  if (normalizedDate === "2026.05.15") {
    return mockAffectedReservations;
  }

  return [];
};
