import { useState } from "react";

import {
  AdminArrowLeftIcon,
  AdminCalendarIcon,
  AdminChevronDownIcon,
  AdminChevronRightIcon,
  AdminClockIcon,
  AdminMemoIcon,
  AdminPlusIcon,
  AdminRoomIcon,
  AdminStatusIcon,
  AdminWarningIcon,
} from "../icons";
import {
  mockAdminPracticeRooms,
  mockAdminRoomDayOffs,
  mockCheckRoomDayOffConflicts,
} from "./mockAdminRooms";
import type {
  AdminPracticeRoom,
  AdminRoomAffectedReservation,
  AdminRoomDayOff,
  AdminRoomDayOffDraft,
  AdminRoomDayOffType,
} from "./types";

type AdminRoomView =
  | { name: "list" }
  | { name: "room-detail"; roomId: number }
  | { name: "room-edit"; roomId: number }
  | { name: "room-create" }
  | { name: "dayoff-create" }
  | { name: "dayoff-impact"; draft: AdminRoomDayOffDraft; reservations: AdminRoomAffectedReservation[] };

type AdminRoomPanelProps = {
  onOpenReservation?: (reservationId: number) => void;
};

const defaultDayOffDraft: AdminRoomDayOffDraft = {
  targetType: "all",
  roomName: "전체 합주실",
  dateLabel: "2026.05.15",
  type: "점검",
  isAllDay: false,
  startTime: "09:00",
  endTime: "18:00",
  reason: "전기 점검",
};

const AdminRoomPanel = ({ onOpenReservation }: AdminRoomPanelProps) => {
  const [activeTab, setActiveTab] = useState<"rooms" | "daysOff">("rooms");
  const [viewStack, setViewStack] = useState<AdminRoomView[]>([{ name: "list" }]);
  const [rooms, setRooms] = useState(mockAdminPracticeRooms);
  const [daysOff, setDaysOff] = useState(mockAdminRoomDayOffs);
  const view = viewStack[viewStack.length - 1] ?? { name: "list" };
  const navigate = (nextView: AdminRoomView) => setViewStack((currentStack) => [...currentStack, nextView]);
  const goBack = () => {
    if (viewStack.length > 1) {
      setViewStack((currentStack) => currentStack.slice(0, -1));
      return;
    }

    setViewStack([{ name: "list" }]);
  };
  const resetView = () => setViewStack([{ name: "list" }]);

  const handleSaveRoom = (nextRoom: AdminPracticeRoom) => {
    setRooms((currentRooms) =>
      currentRooms.map((room) => (room.id === nextRoom.id ? { ...nextRoom, updatedAt: "2026.05.14" } : room)),
    );
    setViewStack([{ name: "list" }, { name: "room-detail", roomId: nextRoom.id }]);
  };

  const handleCreateRoom = (draft: Omit<AdminPracticeRoom, "id" | "updatedAt">) => {
    const nextId = Math.max(...rooms.map((room) => room.id)) + 1;
    const nextRoom: AdminPracticeRoom = {
      id: nextId,
      updatedAt: "2026.05.14",
      ...draft,
    };

    setRooms((currentRooms) => [...currentRooms, nextRoom]);
    setActiveTab("rooms");
    setViewStack([{ name: "list" }, { name: "room-detail", roomId: nextId }]);
  };

  const handleConfirmDayOff = (draft: AdminRoomDayOffDraft) => {
    const nextId = Math.max(...daysOff.map((dayOff) => dayOff.id)) + 1;
    const nextDayOff: AdminRoomDayOff = {
      id: nextId,
      roomName: draft.targetType === "all" ? "전체 합주실" : draft.roomName,
      dateLabel: `${draft.dateLabel} (금)`,
      timeLabel: draft.isAllDay ? "하루전체" : `${draft.startTime}~${draft.endTime}`,
      type: draft.type,
      reason: draft.reason.trim() || "사유 없음",
    };

    setDaysOff((currentDaysOff) => [nextDayOff, ...currentDaysOff]);
    setActiveTab("daysOff");
    resetView();
  };

  const handleCheckDayOff = async (draft: AdminRoomDayOffDraft) => {
    const affectedReservations = await mockCheckRoomDayOffConflicts(draft);

    if (affectedReservations.length === 0) {
      handleConfirmDayOff(draft);
      return;
    }

    navigate({ name: "dayoff-impact", draft, reservations: affectedReservations });
  };

  if (view.name === "room-detail") {
    const room = rooms.find((currentRoom) => currentRoom.id === view.roomId);

    if (!room) {
      return null;
    }

    return (
      <RoomDetailScreen
        room={room}
        dayOffCount={daysOff.filter((dayOff) => dayOff.roomName === room.name || dayOff.roomName === "전체 합주실").length}
        onBack={goBack}
        onEdit={() => navigate({ name: "room-edit", roomId: room.id })}
        onDayOffs={() => {
          setActiveTab("daysOff");
          resetView();
        }}
        onToggleActive={() =>
          setRooms((currentRooms) =>
            currentRooms.map((currentRoom) =>
              currentRoom.id === room.id ? { ...currentRoom, isActive: !currentRoom.isActive } : currentRoom,
            ),
          )
        }
      />
    );
  }

  if (view.name === "room-edit") {
    const room = rooms.find((currentRoom) => currentRoom.id === view.roomId);

    if (!room) {
      return null;
    }

    return (
      <RoomFormScreen
        title="합주실 수정"
        submitLabel="저장하기"
        initialRoom={room}
        onBack={goBack}
        onSubmit={(nextRoom) => handleSaveRoom(nextRoom as AdminPracticeRoom)}
      />
    );
  }

  if (view.name === "room-create") {
    return (
      <RoomFormScreen
        title="합주실 추가"
        submitLabel="등록하기"
        onBack={goBack}
        onSubmit={(draft) => handleCreateRoom(draft)}
      />
    );
  }

  if (view.name === "dayoff-create") {
    return (
      <DayOffCreateScreen
        rooms={rooms}
        onBack={goBack}
        onCheck={handleCheckDayOff}
      />
    );
  }

  if (view.name === "dayoff-impact") {
    return (
      <DayOffImpactScreen
        draft={view.draft}
        reservations={view.reservations}
        onBack={goBack}
        onConfirm={() => handleConfirmDayOff(view.draft)}
        onOpenReservation={onOpenReservation}
      />
    );
  }

  return (
    <section className="admin-rooms" aria-label="합주실 관리">
      <div className="admin-room-tabs">
        <button
          className={activeTab === "rooms" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("rooms")}
        >
          합주실 <strong>{rooms.length}</strong>
        </button>
        <button
          className={activeTab === "daysOff" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("daysOff")}
        >
          쉬는날
        </button>
        <button className="admin-room-dayoff-add" type="button" onClick={() => navigate({ name: "dayoff-create" })}>
          <AdminPlusIcon />
          쉬는날 추가
        </button>
      </div>

      {activeTab === "rooms" ? (
        <RoomList
          rooms={rooms}
          onCreate={() => navigate({ name: "room-create" })}
          onSelect={(roomId) => navigate({ name: "room-detail", roomId })}
        />
      ) : (
        <DayOffList daysOff={daysOff} rooms={rooms} />
      )}
    </section>
  );
};

const ScreenHeader = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) => (
  <header className="admin-sub-screen__header">
    <button type="button" aria-label="뒤로가기" onClick={onBack}>
      <AdminArrowLeftIcon />
    </button>
    <h2>{title}</h2>
  </header>
);

const RoomList = ({
  rooms,
  onCreate,
  onSelect,
}: {
  rooms: AdminPracticeRoom[];
  onCreate: () => void;
  onSelect: (roomId: number) => void;
}) => (
  <>
    <div className="admin-room-list">
      {rooms.map((room) => (
        <button className="admin-room-card" key={room.id} type="button" onClick={() => onSelect(room.id)}>
          <header>
            <AdminRoomIcon />
            <h2>{room.name}</h2>
          </header>
          <p className="admin-room-hours">
            <span>운영시간</span>
            <strong>{room.openTime}~{room.closeTime}</strong>
            <em>24시간 운영</em>
            <i className={room.isOpenAllDay ? "is-open" : "is-closed"}>{room.isOpenAllDay ? "O" : "X"}</i>
          </p>
        </button>
      ))}
    </div>
    <button className="admin-room-add-card" type="button" onClick={onCreate}>
      <AdminPlusIcon />
      합주실 추가하기
    </button>
  </>
);

const DayOffList = ({
  daysOff,
  rooms,
}: {
  daysOff: AdminRoomDayOff[];
  rooms: AdminPracticeRoom[];
}) => (
  <>
    <div className="admin-room-filter-row">
      <label className="admin-user-select-filter">
        <AdminCalendarIcon />
        <select defaultValue="all">
          <option value="all">날짜</option>
        </select>
        <AdminChevronDownIcon />
      </label>
      <label className="admin-user-select-filter">
        <AdminRoomIcon />
        <select defaultValue="all">
          <option value="all">합주실</option>
          <option value="allRooms">전체 합주실</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.name}>
              {room.name}
            </option>
          ))}
        </select>
        <AdminChevronDownIcon />
      </label>
      <label className="admin-user-select-filter">
        <AdminStatusIcon />
        <select defaultValue="all">
          <option value="all">유형</option>
          <option value="휴무">휴무</option>
          <option value="점검">점검</option>
          <option value="기타">기타</option>
        </select>
        <AdminChevronDownIcon />
      </label>
    </div>

    <div className="admin-room-dayoff-list">
      {daysOff.map((dayOff) => (
        <article className="admin-dayoff-card" key={dayOff.id}>
          <header>
            <h2>{dayOff.roomName}</h2>
            <span className={`admin-dayoff-badge is-${dayOff.type}`}>{dayOff.type}</span>
          </header>
          <div className="admin-dayoff-grid">
            <p>
              <span>날짜</span>
              <strong>{dayOff.dateLabel}</strong>
            </p>
            <p>
              <span>시간</span>
              <strong>{dayOff.timeLabel}</strong>
            </p>
          </div>
          <section className="admin-dayoff-reason">
            <AdminClockIcon />
            <div>
              <span>사유</span>
              <strong>{dayOff.reason}</strong>
            </div>
          </section>
        </article>
      ))}
    </div>
  </>
);

const RoomDetailScreen = ({
  room,
  dayOffCount,
  onBack,
  onEdit,
  onDayOffs,
  onToggleActive,
}: {
  room: AdminPracticeRoom;
  dayOffCount: number;
  onBack: () => void;
  onEdit: () => void;
  onDayOffs: () => void;
  onToggleActive: () => void;
}) => (
  <section className="admin-sub-screen">
    <ScreenHeader title="합주실 상세" onBack={onBack} />
    <div className="admin-sub-screen__content">
      <div className="admin-room-detail-hero">
        <div>
          <span className="admin-room-state is-active">{room.isActive ? "활성" : "비활성"}</span>
          <span className="admin-room-state">{room.isOpenAllDay ? "24시간 운영" : "24시간 아님"}</span>
        </div>
        <section>
          <AdminRoomIcon />
          <div>
            <h3>{room.name}</h3>
            <p>{room.description}</p>
          </div>
        </section>
      </div>

      <section className="admin-room-info-card">
        <h3>기본 정보</h3>
        {[
          ["합주실 이름", room.name],
          ["설명", room.description],
          ["운영 시작", room.openTime],
          ["운영 종료", room.closeTime],
          ["24시간 운영", room.isOpenAllDay ? "예" : "아니오"],
          ["정렬 순서", `${room.sortOrder}`],
          ["최근 수정일", room.updatedAt],
        ].map(([label, value]) => (
          <p key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </p>
        ))}
      </section>

      <div className="admin-info-box">
        <AdminMemoIcon />
        <p>운영 시간 변경은 이후 신규 예약 가능 시간에 반영되며 기존 예약은 자동 변경되지 않습니다.</p>
      </div>

      <button className="admin-room-dayoff-link" type="button" onClick={onDayOffs}>
        <div>
          <strong>쉬는날 관리</strong>
          <span>등록된 쉬는날 {dayOffCount}건</span>
        </div>
        <AdminChevronRightIcon />
      </button>
    </div>
    <footer className="admin-sub-actions">
      <button className="is-outline-primary" type="button" onClick={onToggleActive}>
        {room.isActive ? "비활성화" : "활성화"}
      </button>
      <button type="button" onClick={onEdit}>수정하기</button>
    </footer>
  </section>
);

const RoomFormScreen = ({
  title,
  submitLabel,
  initialRoom,
  onBack,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initialRoom?: AdminPracticeRoom;
  onBack: () => void;
  onSubmit: (room: AdminPracticeRoom | Omit<AdminPracticeRoom, "id" | "updatedAt">) => void;
}) => {
  const [name, setName] = useState(initialRoom?.name ?? "E룸");
  const [description, setDescription] = useState(initialRoom?.description ?? "보컬 연습 중심의 소형 합주실");
  const [openTime, setOpenTime] = useState(initialRoom?.openTime ?? "10:00");
  const [closeTime, setCloseTime] = useState(initialRoom?.closeTime ?? "22:00");
  const [isOpenAllDay, setIsOpenAllDay] = useState(initialRoom?.isOpenAllDay ?? false);
  const [isActive, setIsActive] = useState(initialRoom?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initialRoom?.sortOrder ?? 5);
  const descriptionCount = description.length;
  const submit = () => {
    const baseRoom = {
      name: name.trim() || "새 합주실",
      description: description.trim(),
      openTime,
      closeTime,
      isOpenAllDay,
      isActive,
      sortOrder,
    };

    if (initialRoom) {
      onSubmit({ ...initialRoom, ...baseRoom });
      return;
    }

    onSubmit(baseRoom);
  };

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title={title} onBack={onBack} />
      <div className="admin-sub-screen__content">
        {!initialRoom && (
          <div className="admin-info-box">
            <AdminMemoIcon />
            <p>활성 상태로 등록된 합주실만 사용자에게 예약 가능한 목록으로 노출됩니다.</p>
          </div>
        )}
        <label className="admin-form-field">
          <span>합주실 이름 *</span>
          <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="admin-form-field">
          <span>설명</span>
          <textarea value={description} maxLength={100} onChange={(event) => setDescription(event.target.value)} />
          <em>{descriptionCount}/100</em>
        </label>
        <section className="admin-room-form-card">
          <h3>운영 시간 *</h3>
          <div className="admin-room-time-row">
            <label>
              <span>시작</span>
              <select value={openTime} onChange={(event) => setOpenTime(event.target.value)}>
                {["09:00", "10:00", "12:00", "18:00", "0:00"].map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>
            <label>
              <span>종료</span>
              <select value={closeTime} onChange={(event) => setCloseTime(event.target.value)}>
                {["18:00", "22:00", "23:00", "24:00"].map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>
          </div>
          <ToggleRow label="24시간 운영" checked={isOpenAllDay} onChange={setIsOpenAllDay} />
          <ToggleRow label="활성 상태" checked={isActive} onChange={setIsActive} />
        </section>
        <label className="admin-form-field">
          <span>정렬 순서 *</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </label>
        <div className="admin-info-box">
          <AdminWarningIcon />
          <p>
            {initialRoom
              ? "운영 시간 변경은 이후 예약 신청 가능 시간에 반영되며 기존 예약은 자동 변경되지 않습니다."
              : "24시간 운영이 아닌 경우 시작/종료 시간을 명확히 설정해야 합니다."}
          </p>
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>취소</button>
        <button type="button" onClick={submit}>{submitLabel}</button>
      </footer>
    </section>
  );
};

const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="admin-room-toggle-row">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const DayOffCreateScreen = ({
  rooms,
  onBack,
  onCheck,
}: {
  rooms: AdminPracticeRoom[];
  onBack: () => void;
  onCheck: (draft: AdminRoomDayOffDraft) => void;
}) => {
  const [draft, setDraft] = useState<AdminRoomDayOffDraft>({
    ...defaultDayOffDraft,
    roomName: rooms[0]?.name ?? "B201",
  });
  const updateDraft = (nextDraft: Partial<AdminRoomDayOffDraft>) =>
    setDraft((currentDraft) => ({ ...currentDraft, ...nextDraft }));

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="쉬는날 추가" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <p className="admin-room-form-description">설정한 날짜/시간은 신규 예약이 불가능합니다.</p>
        <section className="admin-room-form-card">
          <h3>적용 대상 *</h3>
          <div className="admin-room-target-tabs">
            <button
              className={draft.targetType === "all" ? "is-active" : ""}
              type="button"
              onClick={() => updateDraft({ targetType: "all", roomName: "전체 합주실" })}
            >
              전체 합주실
            </button>
            <button
              className={draft.targetType === "single" ? "is-active" : ""}
              type="button"
              onClick={() => updateDraft({ targetType: "single", roomName: rooms[0]?.name ?? "B201" })}
            >
              특정 합주실
            </button>
          </div>
          {draft.targetType === "single" && (
            <select value={draft.roomName} onChange={(event) => updateDraft({ roomName: event.target.value })}>
              {rooms.map((room) => (
                <option key={room.id} value={room.name}>{room.name}</option>
              ))}
            </select>
          )}
        </section>
        <label className="admin-form-field">
          <span>날짜 *</span>
          <input value={draft.dateLabel} onChange={(event) => updateDraft({ dateLabel: event.target.value })} />
        </label>
        <label className="admin-form-field">
          <span>쉬는날 유형 *</span>
          <select value={draft.type} onChange={(event) => updateDraft({ type: event.target.value as AdminRoomDayOffType })}>
            <option value="휴무">휴무</option>
            <option value="점검">점검</option>
            <option value="기타">기타</option>
          </select>
        </label>
        <section className="admin-room-form-card">
          <ToggleRow label="하루 전체" checked={draft.isAllDay} onChange={(checked) => updateDraft({ isAllDay: checked })} />
          <label className="admin-form-field">
            <span>시작 시간 *</span>
            <select
              value={draft.startTime}
              disabled={draft.isAllDay}
              onChange={(event) => updateDraft({ startTime: event.target.value })}
            >
              {["09:00", "10:00", "13:00", "17:00"].map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </label>
          <label className="admin-form-field">
            <span>종료 시간 *</span>
            <select
              value={draft.endTime}
              disabled={draft.isAllDay}
              onChange={(event) => updateDraft({ endTime: event.target.value })}
            >
              {["11:00", "12:00", "15:00", "18:00"].map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </label>
          <label className="admin-form-field">
            <span>사유</span>
            <textarea value={draft.reason} maxLength={100} onChange={(event) => updateDraft({ reason: event.target.value })} />
            <em>{draft.reason.length}/100</em>
          </label>
        </section>
        <div className="admin-room-warning-box">
          <AdminWarningIcon />
          <p>승인 대기 및 승인 완료된 예약이 있는지 함께 확인해주세요.</p>
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>취소</button>
        <button type="button" onClick={() => onCheck(draft)}>확인하기</button>
      </footer>
    </section>
  );
};

const DayOffImpactScreen = ({
  draft,
  reservations,
  onBack,
  onConfirm,
  onOpenReservation,
}: {
  draft: AdminRoomDayOffDraft;
  reservations: AdminRoomAffectedReservation[];
  onBack: () => void;
  onConfirm: () => void;
  onOpenReservation?: (reservationId: number) => void;
}) => (
  <section className="admin-sub-screen">
    <ScreenHeader title="영향 예약 확인" onBack={onBack} />
    <div className="admin-sub-screen__content">
      <section className="admin-impact-summary">
        <AdminCalendarIcon />
        <div>
          <p><span>대상</span><strong>{draft.targetType === "all" ? "전체 합주실" : draft.roomName}</strong></p>
          <p><span>날짜</span><strong>{draft.dateLabel} (금)</strong></p>
          <p><span>시간</span><strong>{draft.isAllDay ? "00:00~24:00" : `${draft.startTime}~${draft.endTime}`}</strong></p>
          <p><span>유형</span><strong className="admin-impact-type">{draft.type}</strong></p>
          <p><span>사유</span><strong>{draft.reason}</strong></p>
        </div>
      </section>
      <div className="admin-room-warning-box">
        <AdminWarningIcon />
        <p>선택한 기간과 겹치는 예약이 있습니다. 최종 생성을 위해 확인이 필요합니다.</p>
      </div>
      <h3 className="admin-users__section-title">영향을 받는 예약 {reservations.length}건</h3>
      <div className="admin-impact-list">
        {reservations.map((reservation) => (
          <article className="admin-impact-card" key={reservation.id}>
            <AdminRoomIcon />
            <div>
              <h3>{reservation.roomName}</h3>
              <p><span>날짜/시간</span><strong>{reservation.dateTime}</strong></p>
              <p><span>예약자</span><strong>{reservation.reserver}</strong></p>
            </div>
            <section>
              <strong className={reservation.status === "승인 완료" ? "is-approved" : "is-pending"}>
                [{reservation.status.replace(" ", "")}]
              </strong>
            </section>
            <button
              className="admin-impact-card__open"
              type="button"
              aria-label="예약 상세 보기"
              onClick={() => onOpenReservation?.(reservation.id)}
            >
              <AdminChevronRightIcon />
            </button>
          </article>
        ))}
      </div>
      <div className="admin-info-box">
        <AdminMemoIcon />
        <p>쉬는날로 설정한 기간의 기존 예약, 승인 완료 예약, 승인 대기 예약은 모두 취소된 후 쉬는날이 설정됩니다.</p>
      </div>
    </div>
    <footer className="admin-sub-actions">
      <button type="button" onClick={onBack}>이전으로</button>
      <button className="is-danger" type="button" onClick={onConfirm}>최종 생성</button>
    </footer>
  </section>
);

export default AdminRoomPanel;
