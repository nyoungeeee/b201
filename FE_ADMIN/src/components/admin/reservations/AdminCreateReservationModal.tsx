import { useRef, useState } from "react";

import {
  AdminArrowLeftIcon,
  AdminClockIcon,
  AdminReservationIcon,
  AdminWarningIcon,
} from "../icons";
import AdminSelect from "../common/AdminSelect";
import AdminDayPicker from "../common/AdminDayPicker";
import AdminCreateConflictReview from "./AdminCreateConflictReview";
import * as adminApi from "../../../apis/adminApi";
import type {
  AdminReservationConflict,
  AdminReservationRoomOption,
  AdminRoom,
  NewAdminReservation,
} from "./types";

type AdminReservationTeamOption = {
  id: number;
  name: string;
};

type AdminCreateReservationModalProps = {
  onClose: () => void;
  onCreate: (reservation: NewAdminReservation, canceledConflictIds?: number[]) => void;
  rooms: AdminReservationRoomOption[];
  teamOptions: AdminReservationTeamOption[];
  hasMoreTeamOptions: boolean;
  isLoadingTeamOptions: boolean;
  onLoadMoreTeamOptions: () => void;
};

const getTodayDateDot = () => {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
};

const dotToHyphen = (dateDot: string) => dateDot.replace(/\./g, "-");

const halfHourTimeOptions = Array.from({ length: 49 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const label = `${String(hour).padStart(2, "0")}:${minute}`;
  return { value: label, label };
});

// 24:00을 시작 시간으로 선택하면 종료 시간이 없어지므로 시작 시간에서 제외
const startTimeOptions = halfHourTimeOptions.slice(0, 48);

// 다음날 시간: value는 "24:30"~"30:00" (문자열 정렬로 당일 시간보다 항상 크게 유지)
// 표시: "다음날 00:30"~"다음날 06:00"
const nextDayTimeOptions = Array.from({ length: 12 }, (_, i) => {
  const totalHalfHours = 49 + i; // 49번째(=24:00) 이후부터
  const hour = Math.floor(totalHalfHours / 2); // 24, 24, 25, 25, ...
  const minute = totalHalfHours % 2 === 0 ? "00" : "30";
  const displayHour = hour - 24;
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  const label = `다음날 ${String(displayHour).padStart(2, "0")}:${minute}`;
  return { value, label };
});

const normalizeTimeValue = (time: string | undefined, fallback: string) => {
  if (!time) {
    return fallback;
  }

  const [hour = "", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

const getNextEndTime = (startTime: string) => {
  const nextIndex = halfHourTimeOptions.findIndex((option) => option.value === startTime) + 1;
  return halfHourTimeOptions[nextIndex]?.value ?? nextDayTimeOptions[0].value;
};

const AdminCreateReservationModal = ({
  onClose,
  onCreate,
  rooms,
  teamOptions,
  hasMoreTeamOptions,
  isLoadingTeamOptions,
  onLoadMoreTeamOptions,
}: AdminCreateReservationModalProps) => {
  const initialStartTime = normalizeTimeValue(rooms[0]?.openTime, "19:00");
  const [date, setDate] = useState(getTodayDateDot());
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(
    "22:00" > initialStartTime ? "22:00" : getNextEndTime(initialStartTime),
  );
  const [room, setRoom] = useState<AdminRoom>(rooms[0]?.name ?? "");
  const selectedRoom = rooms.find((roomOption) => roomOption.name === room);
  const selectedRoomOpenTime = normalizeTimeValue(selectedRoom?.openTime, "00:00");
  const selectableStartTimeOptions = startTimeOptions.filter(
    (option) => option.value >= selectedRoomOpenTime,
  );

  const endTimeOptions = [
    ...halfHourTimeOptions.filter((option) => option.value > startTime),
    ...nextDayTimeOptions,
  ];

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    // 다음날 시간("24:30" 이상)이면 시작 시간 변경에 관계없이 유지
    const isEndTimeNextDay = endTime >= "24:30";
    if (!isEndTimeNextDay && endTime <= newStartTime) {
      setEndTime(getNextEndTime(newStartTime));
    }
  };

  const handleRoomChange = (nextRoom: AdminReservationRoomOption) => {
    const nextOpenTime = normalizeTimeValue(nextRoom.openTime, "00:00");
    setRoom(nextRoom.name);

    if (startTime < nextOpenTime) {
      setStartTime(nextOpenTime);
      if (endTime <= nextOpenTime) {
        setEndTime(getNextEndTime(nextOpenTime));
      }
    }
  };

  const [reservationOwnerType, setReservationOwnerType] = useState<"owner" | "team">("owner");
  const [selectedTeamId, setSelectedTeamId] = useState(String(teamOptions[0]?.id ?? ""));
  const [title, setTitle] = useState("");
  const [isTitleInvalid, setIsTitleInvalid] = useState(false);
  const [memo, setMemo] = useState("");
  const [pendingReservation, setPendingReservation] = useState<NewAdminReservation | null>(null);
  const [conflicts, setConflicts] = useState<AdminReservationConflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const titleFieldRef = useRef<HTMLLabelElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isTitleEmpty = !title.trim();

  const handleSubmit = async () => {
    if (isTitleEmpty) {
      setIsTitleInvalid(true);
      titleFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      titleInputRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!date || !startTime || !endTime || !room || !title.trim()) {
      return;
    }
    const selectedTeam =
      reservationOwnerType === "owner"
        ? null
        : teamOptions.find((team) => String(team.id) === selectedTeamId) ?? null;

    const nextReservation = {
      date: dotToHyphen(date),
      startTime,
      endTime,
      room,
      teamId: selectedTeam?.id,
      teamName: selectedTeam?.name,
      title: title.trim(),
      memo: memo.trim(),
    };

    setIsChecking(true);
    const conflictResults = await adminApi.checkReservationConflicts(nextReservation);
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
          <AdminDayPicker
            className="admin-create-control admin-create-control--picker"
            value={date}
            minValue={getTodayDateDot()}
            onChange={setDate}
          />
        </label>

        <div className="admin-create-field">
          <span>
            예약 시간 <strong>*</strong>
          </span>
          <div className="admin-create-time-row">
            <AdminSelect
              className="admin-create-control admin-create-control--picker"
              value={startTime}
              icon={<AdminClockIcon size={28} />}
              options={selectableStartTimeOptions}
              onChange={handleStartTimeChange}
            />
            <span className="admin-create-time-row__dash">~</span>
            <AdminSelect
              className="admin-create-control admin-create-control--picker"
              value={endTime}
              icon={<AdminClockIcon size={28} />}
              options={endTimeOptions}
              onChange={setEndTime}
            />
          </div>
        </div>

        <fieldset className="admin-create-field admin-create-room-field">
          <legend>
            예약 룸 <strong>*</strong>
          </legend>
          <div className="admin-create-room-tabs">
            {rooms.map((roomOption) => (
              <button
                key={roomOption.name}
                className={room === roomOption.name ? "is-active" : ""}
                type="button"
                onClick={() => handleRoomChange(roomOption)}
              >
                {roomOption.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="admin-create-field admin-create-owner-field">
          <legend>
            예약 구분 <strong>*</strong>
          </legend>
          <div className="admin-create-owner-radios">
            <label>
              <input
                type="radio"
                checked={reservationOwnerType === "owner"}
                onChange={() => setReservationOwnerType("owner")}
              />
              <span>사장님 개인</span>
            </label>
            <label>
              <input
                type="radio"
                checked={reservationOwnerType === "team"}
                onChange={() => setReservationOwnerType("team")}
              />
              <span>팀 예약</span>
            </label>
          </div>
          {reservationOwnerType === "team" && (
            <div className="admin-create-team-select-group">
              <AdminSelect
                className="admin-create-team-select"
                value={selectedTeamId}
                options={teamOptions.map((team) => ({ value: String(team.id), label: team.name }))}
                onChange={setSelectedTeamId}
              />
              {hasMoreTeamOptions && (
                <button
                  className="admin-create-team-load-more"
                  type="button"
                  disabled={isLoadingTeamOptions}
                  onClick={onLoadMoreTeamOptions}
                >
                  {isLoadingTeamOptions ? "팀을 불러오는 중" : "팀 더 불러오기"}
                </button>
              )}
            </div>
          )}
        </fieldset>

        <label
          className={`admin-create-field${isTitleInvalid ? " is-invalid" : ""}`}
          ref={titleFieldRef}
        >
          <span>
            예약명 <strong>*</strong>
          </span>
          <div className="admin-create-control">
            <AdminReservationIcon size={28} />
            <input
              ref={titleInputRef}
              value={title}
              maxLength={30}
              aria-invalid={isTitleInvalid}
              onChange={(event) => {
                setTitle(event.target.value);
                if (event.target.value.trim()) {
                  setIsTitleInvalid(false);
                }
              }}
              placeholder="ex ) 사장님 개인 사용"
            />
          </div>
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
        <button
          className={`admin-create-actions__submit${isTitleEmpty ? " is-incomplete" : ""}`}
          type="button"
          aria-disabled={isTitleEmpty || isChecking}
          onClick={handleSubmit}
          disabled={isChecking}
        >
          {isChecking ? "확인 중" : "예약하기"}
        </button>
      </footer>
    </section>
  );
};

export default AdminCreateReservationModal;
