import { useState } from "react";

import {
  AdminArrowLeftIcon,
  AdminCalendarIcon,
  AdminChevronDownIcon,
  AdminClockIcon,
  AdminWarningIcon,
} from "../icons";
import AdminCreateConflictReview from "./AdminCreateConflictReview";
import type { AdminReservationConflict, AdminRoom, NewAdminReservation } from "./types";

type AdminCreateReservationModalProps = {
  onClose: () => void;
  onCreate: (reservation: NewAdminReservation, canceledConflictIds?: number[]) => void;
};

const rooms: AdminRoom[] = ["A룸", "B룸", "C룸", "D룸"];

const mockCheckReservationConflicts = async (
  reservation: NewAdminReservation,
): Promise<AdminReservationConflict[]> => {
  const hasConflict = reservation.room === "B룸" && reservation.date === "2026-05-15";

  if (!hasConflict) {
    return [];
  }

  return [
    {
      id: 1,
      room: "B룸",
      date: "2026.05.15",
      timeLabel: "19:00~21:00",
      ownerLabel: "팀: 사운드웨이브",
      status: "approved",
    },
    {
      id: 3,
      room: "B룸",
      date: "2026.05.15",
      timeLabel: "21:00~22:00",
      ownerLabel: "개인 예약: 박지훈",
      status: "approved",
    },
    {
      id: 4,
      room: "B룸",
      date: "2026.05.15",
      timeLabel: "18:30~19:30",
      ownerLabel: "팀: 블루코드",
      status: "pending",
    },
  ];
};

const AdminCreateReservationModal = ({ onClose, onCreate }: AdminCreateReservationModalProps) => {
  const [date, setDate] = useState("2026-05-15");
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("22:00");
  const [room, setRoom] = useState<AdminRoom>("B룸");
  const [title, setTitle] = useState("사장님 개인 사용");
  const [memo, setMemo] = useState("");
  const [pendingReservation, setPendingReservation] = useState<NewAdminReservation | null>(null);
  const [conflicts, setConflicts] = useState<AdminReservationConflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async () => {
    if (!date || !startTime || !endTime || !title.trim()) {
      return;
    }

    const nextReservation = {
      date,
      startTime,
      endTime,
      room,
      title: title.trim(),
      memo: memo.trim(),
    };

    setIsChecking(true);
    const conflictResults = await mockCheckReservationConflicts(nextReservation);
    setIsChecking(false);

    if (conflictResults.length > 0) {
      setPendingReservation(nextReservation);
      setConflicts(conflictResults);
      return;
    }

    onCreate(nextReservation);
  };

  if (pendingReservation) {
    return (
      <AdminCreateConflictReview
        reservation={pendingReservation}
        conflicts={conflicts}
        onBack={() => {
          setPendingReservation(null);
          setConflicts([]);
        }}
        onConfirm={() => onCreate(pendingReservation, conflicts.map((conflict) => conflict.id))}
      />
    );
  }

  return (
    <section className="admin-create" aria-label="사장님 전용 예약 생성">
      <header className="admin-create__header">
        <button className="admin-create__back" type="button" aria-label="뒤로가기" onClick={onClose}>
          <AdminArrowLeftIcon />
        </button>
        <h2>사장님 전용 예약 생성</h2>
        <p>일반 사용자 예약과 별도로 직접 생성하는 예약입니다.</p>
      </header>

      <div className="admin-create__form">
        <label className="admin-create-field">
          <span>
            예약 날짜 <strong>*</strong>
          </span>
          <div className="admin-create-control">
            <AdminCalendarIcon size={28} />
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <AdminChevronDownIcon size={24} />
          </div>
        </label>

        <div className="admin-create-field">
          <span>
            예약 시간 <strong>*</strong>
          </span>
          <div className="admin-create-time-row">
            <label className="admin-create-control">
              <AdminClockIcon size={28} />
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              <AdminChevronDownIcon size={24} />
            </label>
            <span className="admin-create-time-row__dash">~</span>
            <label className="admin-create-control">
              <AdminClockIcon size={28} />
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              <AdminChevronDownIcon size={24} />
            </label>
          </div>
        </div>

        <fieldset className="admin-create-field admin-create-room-field">
          <legend>
            예약 룸 <strong>*</strong>
          </legend>
          <div className="admin-create-room-tabs">
            {rooms.map((roomName) => (
              <button
                key={roomName}
                className={room === roomName ? "is-active" : ""}
                type="button"
                onClick={() => setRoom(roomName)}
              >
                {roomName}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="admin-create-field">
          <span>
            예약명 <strong>*</strong>
          </span>
          <input
            className="admin-create-text-input"
            value={title}
            maxLength={30}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예약명을 입력하세요"
          />
        </label>

        <label className="admin-create-field">
          <span>메모 (선택)</span>
          <div className="admin-create-memo">
            <textarea
              value={memo}
              maxLength={300}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="필요 시 메모를 입력하세요"
            />
            <span>{memo.length} / 300</span>
          </div>
        </label>

        <div className="admin-create-notice">
          <AdminWarningIcon />
          <div>
            <strong>반복 예약은 지원하지 않습니다.</strong>
            <p>기존 예약과 시간이 겹치면 영향을 받는 예약을 확인한 뒤 최종 생성할 수 있습니다.</p>
          </div>
        </div>
      </div>

      <footer className="admin-create-actions">
        <button className="admin-create-actions__cancel" type="button" onClick={onClose}>
          취소
        </button>
        <button className="admin-create-actions__submit" type="button" onClick={handleSubmit} disabled={isChecking}>
          {isChecking ? "확인 중" : "예약하기"}
        </button>
      </footer>
    </section>
  );
};

export default AdminCreateReservationModal;
