import { useEffect, useState } from "react";

import {
  AdminArrowLeftIcon,
  AdminCalendarIcon,
  AdminChevronRightIcon,
  AdminClockIcon,
  AdminMemoIcon,
  AdminPlusIcon,
  AdminRoomIcon,
  AdminStatusIcon,
  AdminWarningIcon,
} from "../icons";
import AdminSelect from "../common/AdminSelect";
import AdminDayPicker from "../common/AdminDayPicker";
import * as adminApi from "../../../apis/adminApi";
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
  | { name: "room-delete"; roomId: number }
  | { name: "room-create" }
  | { name: "dayoff-detail"; dayOffId: number }
  | { name: "dayoff-delete"; dayOffId: number }
  | { name: "dayoff-create" }
  | {
      name: "dayoff-impact";
      draft: AdminRoomDayOffDraft;
      reservations: AdminRoomAffectedReservation[];
    };

type AdminRoomPanelProps = {
  onOpenReservation?: (reservationId: number) => void;
  onToast?: (message: string) => void;
};

const DAY_NAMES = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
];

const getDateLabelWithDay = (dateLabel: string) => {
  const [year, month, day] = dateLabel.split(".").map(Number);
  const dayName = DAY_NAMES[new Date(year, month - 1, day).getDay()];
  return `${dateLabel} ${dayName}`;
};

const getTodayDateLabel = () => {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
};

const halfHourTimeOptions = Array.from({ length: 49 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;

  return { value, label: value };
});

const startTimeSelectOptions = halfHourTimeOptions.slice(0, 48);

const formatRoomOperatingHours = (room: AdminPracticeRoom) =>
  room.isOpenAllDay
    ? `${room.openTime}~다음날 ${room.openTime}`
    : `${room.openTime}~${room.closeTime}`;

const defaultDayOffDraft: AdminRoomDayOffDraft = {
  targetType: "all",
  roomName: "전체 합주실",
  dateLabel: getTodayDateLabel(),
  endDateLabel: getTodayDateLabel(),
  type: "점검",
  isAllDay: false,
  startTime: "09:00",
  endTime: "18:00",
  reason: "",
};

const AdminRoomPanel = ({
  onOpenReservation,
  onToast,
}: AdminRoomPanelProps) => {
  const [activeTab, setActiveTab] = useState<"rooms" | "daysOff">("rooms");
  const [viewStack, setViewStack] = useState<AdminRoomView[]>([
    { name: "list" },
  ]);
  const [rooms, setRooms] = useState<AdminPracticeRoom[]>([]);
  const [daysOff, setDaysOff] = useState<AdminRoomDayOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      adminApi.getRooms().then((nextRooms) => {
        if (isActive) setRooms(nextRooms);
      }),
      adminApi.getDayOffs().then((nextDaysOff) => {
        if (isActive) setDaysOff(nextDaysOff);
      }),
    ])
      .then((results) => {
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error(result.reason);
          }
        });
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);
  const activeRooms = rooms.filter((room) => room.isActive);
  const view = viewStack[viewStack.length - 1] ?? { name: "list" };
  const navigate = (nextView: AdminRoomView) =>
    setViewStack((currentStack) => [...currentStack, nextView]);
  const goBack = () => {
    if (viewStack.length > 1) {
      setViewStack((currentStack) => currentStack.slice(0, -1));
      return;
    }

    setViewStack([{ name: "list" }]);
  };
  const resetView = () => setViewStack([{ name: "list" }]);

  const handleSaveRoom = (nextRoom: AdminPracticeRoom) => {
    adminApi.updateRoom(nextRoom.id, nextRoom).catch(console.error);
    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === nextRoom.id
          ? { ...nextRoom, updatedAt: "2026.05.14" }
          : room,
      ),
    );
    setViewStack([
      { name: "list" },
      { name: "room-detail", roomId: nextRoom.id },
    ]);
    onToast?.("합주실을 저장했습니다.");
  };

  const handleCreateRoom = async (
    draft: Omit<AdminPracticeRoom, "id" | "updatedAt">,
  ) => {
    const created = await adminApi.createRoom(draft);
    setRooms((currentRooms) => [...currentRooms, created]);
    setActiveTab("rooms");
    setViewStack([
      { name: "list" },
      { name: "room-detail", roomId: created.id },
    ]);
    onToast?.("합주실을 추가했습니다.");
  };

  const handleConfirmDayOff = async (draft: AdminRoomDayOffDraft) => {
    const created = await adminApi.createDayOff(draft);
    setDaysOff((currentDaysOff) => [created, ...currentDaysOff]);
    setActiveTab("daysOff");
    resetView();
    onToast?.(`쉬는날 - ${draft.type}을 설정했습니다.`);
  };

  const handleCheckDayOff = async (draft: AdminRoomDayOffDraft) => {
    const affectedReservations = await adminApi.checkDayOffConflicts(draft);

    if (affectedReservations.length === 0) {
      handleConfirmDayOff(draft);
      return;
    }

    navigate({
      name: "dayoff-impact",
      draft,
      reservations: affectedReservations,
    });
  };

  const handleDeleteDayOff = async (dayOff: AdminRoomDayOff) => {
    await adminApi.deleteDayOff(dayOff.id);
    setDaysOff((currentDaysOff) =>
      currentDaysOff.filter((currentDayOff) => currentDayOff.id !== dayOff.id),
    );
    setActiveTab("daysOff");
    resetView();
    onToast?.("쉬는날을 삭제했습니다.");
  };

  if (view.name === "room-detail") {
    const room = rooms.find((currentRoom) => currentRoom.id === view.roomId);

    if (!room) {
      return null;
    }

    return (
      <RoomDetailScreen
        room={room}
        dayOffCount={
          daysOff.filter(
            (dayOff) =>
              dayOff.roomName === room.name ||
              dayOff.roomName === "전체 합주실",
          ).length
        }
        onBack={goBack}
        onEdit={() => navigate({ name: "room-edit", roomId: room.id })}
        onDayOffs={() => {
          setActiveTab("daysOff");
          resetView();
        }}
        onDelete={() => navigate({ name: "room-delete", roomId: room.id })}
      />
    );
  }

  if (view.name === "room-delete") {
    const room = rooms.find((currentRoom) => currentRoom.id === view.roomId);

    if (!room) {
      return null;
    }

    return (
      <RoomDeleteScreen
        room={room}
        onBack={goBack}
        onConfirm={() => {
          adminApi.deleteRoom(room.id).catch(console.error);
          setRooms((currentRooms) =>
            currentRooms.map((currentRoom) =>
              currentRoom.id === room.id
                ? { ...currentRoom, isActive: false }
                : currentRoom,
            ),
          );
          resetView();
          onToast?.("합주실을 삭제했습니다.");
        }}
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
        rooms={activeRooms}
        onBack={goBack}
        onCheck={handleCheckDayOff}
      />
    );
  }

  if (view.name === "dayoff-detail") {
    const dayOff = daysOff.find(
      (currentDayOff) => currentDayOff.id === view.dayOffId,
    );

    if (!dayOff) {
      return null;
    }

    return (
      <DayOffDetailScreen
        dayOff={dayOff}
        onBack={goBack}
        onDelete={() =>
          navigate({ name: "dayoff-delete", dayOffId: dayOff.id })
        }
      />
    );
  }

  if (view.name === "dayoff-delete") {
    const dayOff = daysOff.find(
      (currentDayOff) => currentDayOff.id === view.dayOffId,
    );

    if (!dayOff) {
      return null;
    }

    return (
      <DayOffDeleteScreen
        dayOff={dayOff}
        onBack={goBack}
        onConfirm={() => handleDeleteDayOff(dayOff).catch(console.error)}
      />
    );
  }

  if (view.name === "dayoff-impact") {
    return (
      <DayOffImpactScreen
        draft={view.draft}
        reservations={view.reservations}
        onBack={goBack}
        onConfirm={() =>
          adminApi
            .createDayOff(
              view.draft,
              view.reservations.map((reservation) => reservation.id),
            )
            .then((created) => {
              setDaysOff((currentDaysOff) => [created, ...currentDaysOff]);
              setActiveTab("daysOff");
              resetView();
              onToast?.(`쉬는날 - ${view.draft.type}을 설정했습니다.`);
            })
            .catch(console.error)
        }
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
          합주실 <strong>{activeRooms.length}</strong>
        </button>
        <button
          className={activeTab === "daysOff" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("daysOff")}
        >
          쉬는날
        </button>
        <button
          className="admin-room-dayoff-add"
          type="button"
          onClick={() => navigate({ name: "dayoff-create" })}
        >
          <AdminPlusIcon />
          쉬는날 추가
        </button>
      </div>

      <div className="admin-panel-scroll">
        {isLoading ? (
          <div className="admin-user-loading" role="status" aria-live="polite">
            <div className="admin-user-loading__spinner" aria-hidden="true" />
            <p>합주실 데이터를 불러오고 있어요.</p>
          </div>
        ) : activeTab === "rooms" ? (
          <RoomList
            rooms={activeRooms}
            onCreate={() => navigate({ name: "room-create" })}
            onSelect={(roomId) => navigate({ name: "room-detail", roomId })}
          />
        ) : (
          <DayOffList
            daysOff={daysOff}
            rooms={activeRooms}
            onSelect={(dayOffId) => navigate({ name: "dayoff-detail", dayOffId })}
          />
        )}
      </div>
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
      {rooms.length > 0 ? (
        rooms.map((room) => (
          <button
            className="admin-room-card"
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
          >
            <header>
              <AdminRoomIcon />
              <h2>{room.name}</h2>
            </header>
            <p className="admin-room-hours">
              <span>운영시간</span>
              <strong>{formatRoomOperatingHours(room)}</strong>
              <em>24시간 운영</em>
              <i className={room.isOpenAllDay ? "is-open" : "is-closed"}>
                {room.isOpenAllDay ? "O" : "X"}
              </i>
            </p>
          </button>
        ))
      ) : (
        <p className="admin-reservation__empty">등록된 합주실이 없습니다.</p>
      )}
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
  onSelect,
}: {
  daysOff: AdminRoomDayOff[];
  rooms: AdminPracticeRoom[];
  onSelect: (dayOffId: number) => void;
}) => {
  const [dateFilter, setDateFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  return (
    <>
      <div className="admin-room-filter-row">
        <AdminSelect
          className="admin-user-select-filter"
          value={dateFilter}
          icon={<AdminCalendarIcon />}
          options={[{ value: "all", label: "날짜" }]}
          onChange={setDateFilter}
        />
        <AdminSelect
          className="admin-user-select-filter"
          value={roomFilter}
          icon={<AdminRoomIcon />}
          options={[
            { value: "all", label: "합주실" },
            { value: "allRooms", label: "전체 합주실" },
            ...rooms.map((room) => ({ value: room.name, label: room.name })),
          ]}
          onChange={setRoomFilter}
        />
        <AdminSelect
          className="admin-user-select-filter"
          value={typeFilter}
          icon={<AdminStatusIcon />}
          options={[
            { value: "all", label: "유형" },
            { value: "휴무", label: "휴무" },
            { value: "점검", label: "점검" },
            { value: "기타", label: "기타" },
          ]}
          onChange={setTypeFilter}
        />
      </div>

      <div className="admin-room-dayoff-list">
        {daysOff.length > 0 ? (
          daysOff.map((dayOff) => (
            <button
              className="admin-dayoff-card"
              key={dayOff.id}
              type="button"
              onClick={() => onSelect(dayOff.id)}
            >
              <header>
                <h2>{dayOff.roomName}</h2>
                <span className={`admin-dayoff-badge is-${dayOff.type}`}>
                  {dayOff.type}
                </span>
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
            </button>
          ))
        ) : (
          <p className="admin-reservation__empty">등록된 쉬는날이 없습니다.</p>
        )}
      </div>
    </>
  );
};

const DayOffDetailScreen = ({
  dayOff,
  onBack,
  onDelete,
}: {
  dayOff: AdminRoomDayOff;
  onBack: () => void;
  onDelete: () => void;
}) => (
  <section className="admin-sub-screen">
    <ScreenHeader title="쉬는날 상세" onBack={onBack} />
    <div className="admin-sub-screen__content">
      <div className="admin-room-detail-hero">
        <div>
          <span className={`admin-dayoff-badge is-${dayOff.type}`}>
            {dayOff.type}
          </span>
        </div>
        <section>
          <AdminCalendarIcon />
          <div>
            <h3>{dayOff.roomName}</h3>
            <p>{dayOff.dateLabel}</p>
          </div>
        </section>
      </div>

      <section className="admin-room-info-card">
        <h3>기본 정보</h3>
        {[
          ["대상", dayOff.roomName],
          ["유형", dayOff.type],
          ["날짜", dayOff.dateLabel],
          ["시간", dayOff.timeLabel],
          ["사유", dayOff.reason || "-"],
        ].map(([label, value]) => (
          <p key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </p>
        ))}
      </section>

      <div className="admin-info-box">
        <AdminMemoIcon />
        <p>
          쉬는날을 삭제하면 해당 날짜와 시간대가 다시 예약 가능 상태로
          반영됩니다.
        </p>
      </div>
    </div>
    <footer className="admin-sub-actions">
      <button type="button" onClick={onBack}>
        목록으로
      </button>
      <button className="is-outline-danger" type="button" onClick={onDelete}>
        삭제하기
      </button>
    </footer>
  </section>
);

const DayOffDeleteScreen = ({
  dayOff,
  onBack,
  onConfirm,
}: {
  dayOff: AdminRoomDayOff;
  onBack: () => void;
  onConfirm: () => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const requiredText = `${dayOff.roomName} 쉬는날 삭제한다`;
  const canDelete = confirmText.trim() === requiredText;

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="쉬는날 삭제" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <section className="admin-room-delete-danger">
          <AdminWarningIcon />
          <div>
            <h3>쉬는날을 삭제하시겠어요?</h3>
            <p>
              삭제 후 {dayOff.roomName}의 해당 날짜와 시간대는 다시 예약 가능
              상태로 반영됩니다.
            </p>
          </div>
        </section>

        <section className="admin-room-delete-card">
          <h3>삭제 전 반드시 확인</h3>
          <ul>
            <li>삭제한 쉬는날은 목록과 상세 화면에서 즉시 사라집니다.</li>
            <li>이미 취소된 예약은 쉬는날 삭제만으로 자동 복구되지 않습니다.</li>
            <li>같은 시간대 예약 가능 여부는 사용자 예약 화면에 반영됩니다.</li>
          </ul>
        </section>

        <section className="admin-room-delete-room">
          <span>삭제 대상</span>
          <strong>{dayOff.roomName}</strong>
          <p>
            {dayOff.dateLabel} / {dayOff.timeLabel} / {dayOff.type}
          </p>
        </section>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>
          취소
        </button>
        <button
          className="is-danger"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          최종 삭제
        </button>
      </footer>

      {isModalOpen ? (
        <div
          className="admin-room-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-label="쉬는날 삭제 최종 확인"
        >
          <div className="admin-room-delete-modal__panel">
            <AdminWarningIcon />
            <h3>삭제 확인 문구를 입력해주세요</h3>
            <p>
              아래 입력창에 <strong>{requiredText}</strong>를 정확히 입력해야
              삭제할 수 있습니다.
            </p>
            <input
              type="text"
              value={confirmText}
              placeholder={requiredText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoFocus
            />
            <div className="admin-room-delete-modal__actions">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmText("");
                }}
              >
                취소
              </button>
              <button
                className="is-danger"
                type="button"
                disabled={!canDelete}
                onClick={onConfirm}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const RoomDetailScreen = ({
  room,
  dayOffCount,
  onBack,
  onEdit,
  onDayOffs,
  onDelete,
}: {
  room: AdminPracticeRoom;
  dayOffCount: number;
  onBack: () => void;
  onEdit: () => void;
  onDayOffs: () => void;
  onDelete: () => void;
}) => (
  <section className="admin-sub-screen">
    <ScreenHeader title="합주실 상세" onBack={onBack} />
    <div className="admin-sub-screen__content">
      <div className="admin-room-detail-hero">
        <div>
          <span
            className={`admin-room-state${room.isActive ? " is-active" : " is-deleted"}`}
          >
            {room.isActive ? "활성" : "삭제됨"}
          </span>
          <span className="admin-room-state">
            {room.isOpenAllDay ? "24시간 운영" : "24시간 아님"}
          </span>
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
          [
            "운영 종료",
            room.isOpenAllDay ? `다음날 ${room.openTime}` : room.closeTime,
          ],
          ["24시간 운영", room.isOpenAllDay ? "예" : "아니오"],
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
        <p>
          운영 시간 변경은 이후 신규 예약 가능 시간에 반영되며 기존 예약은 자동
          변경되지 않습니다.
        </p>
      </div>

      <button
        className="admin-room-dayoff-link"
        type="button"
        onClick={onDayOffs}
      >
        <div>
          <strong>쉬는날 관리</strong>
          <span>등록된 쉬는날 {dayOffCount}건</span>
        </div>
        <AdminChevronRightIcon />
      </button>
    </div>
    <footer className="admin-sub-actions">
      <button
        className={room.isActive ? "is-outline-danger" : "is-disabled"}
        type="button"
        disabled={!room.isActive}
        onClick={onDelete}
      >
        {room.isActive ? "삭제하기" : "삭제됨"}
      </button>
      <button type="button" onClick={onEdit}>
        수정하기
      </button>
    </footer>
  </section>
);

const RoomDeleteScreen = ({
  room,
  onBack,
  onConfirm,
}: {
  room: AdminPracticeRoom;
  onBack: () => void;
  onConfirm: () => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const requiredText = `${room.name} 삭제한다`;
  const canDelete = confirmText.trim() === requiredText;

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="합주실 삭제" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <section className="admin-room-delete-danger">
          <AdminWarningIcon />
          <div>
            <h3>진짜로 삭제하시겠어요?</h3>
            <p>
              {room.name}은 삭제 후 사용자 화면과 예약 가능한 합주실 목록에서
              즉시 사라집니다.
            </p>
          </div>
        </section>

        <section className="admin-room-delete-card">
          <h3>삭제 전 반드시 확인</h3>
          <ul>
            <li>
              이 합주실의 승인 대기 예약과 승인 완료 예약은 모두 취소
              처리됩니다.
            </li>
            <li>
              이미 예약자에게 안내가 필요한 예약도 자동으로 복구되지 않습니다.
            </li>
            <li>
              삭제된 합주실은 사용자 입장에서 다시 보이거나 예약할 수 없습니다.
            </li>
            <li>
              쉬는날, 운영시간, 합주실 상세 정보도 관리 목록에서 숨겨집니다.
            </li>
          </ul>
        </section>

        <section className="admin-room-delete-room">
          <span>삭제 대상</span>
          <strong>{room.name}</strong>
          <p>{room.description}</p>
        </section>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>
          취소
        </button>
        <button
          className="is-danger"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          최종 삭제
        </button>
      </footer>

      {isModalOpen ? (
        <div
          className="admin-room-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-label="합주실 삭제 최종 확인"
        >
          <div className="admin-room-delete-modal__panel">
            <AdminWarningIcon />
            <h3>삭제할 합주실명을 입력해주세요</h3>
            <p>
              아래 입력창에 <strong>{requiredText}</strong>를 정확히 입력해야
              삭제할 수 있습니다.
            </p>
            <input
              type="text"
              value={confirmText}
              placeholder={requiredText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoFocus
            />
            <div className="admin-room-delete-modal__actions">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmText("");
                }}
              >
                취소
              </button>
              <button
                className="is-danger"
                type="button"
                disabled={!canDelete}
                onClick={onConfirm}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

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
  onSubmit: (
    room: AdminPracticeRoom | Omit<AdminPracticeRoom, "id" | "updatedAt">,
  ) => void;
}) => {
  const [name, setName] = useState(initialRoom?.name ?? "E룸");
  const [description, setDescription] = useState(
    initialRoom?.description ?? "",
  );
  const [openTime, setOpenTime] = useState(initialRoom?.openTime ?? "10:00");
  const [closeTime, setCloseTime] = useState(initialRoom?.closeTime ?? "22:00");
  const [isOpenAllDay, setIsOpenAllDay] = useState(
    initialRoom?.isOpenAllDay ?? false,
  );
  const [isActive, setIsActive] = useState(initialRoom?.isActive ?? true);
  const descriptionCount = description.length;
  const submit = () => {
    const baseRoom = {
      name: name.trim() || "새 합주실",
      description: description.trim(),
      openTime,
      closeTime: isOpenAllDay ? openTime : closeTime,
      isOpenAllDay,
      isActive,
      sortOrder: initialRoom?.sortOrder ?? 5,
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
            <p>
              활성 상태로 등록된 합주실만 사용자에게 예약 가능한 목록으로
              노출됩니다.
            </p>
          </div>
        )}
        <label className="admin-form-field">
          <span>합주실 이름 *</span>
          <input
            value={name}
            maxLength={20}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="admin-form-field">
          <span>설명</span>
          <textarea
            value={description}
            maxLength={100}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="ex ) 보컬 연습 중심의 소형 합주실"
          />
          <em>{descriptionCount}/100</em>
        </label>
        <section className="admin-room-form-card">
          <h3>운영 시간 *</h3>
          <div
            className={`admin-room-time-row${isOpenAllDay ? " admin-room-time-row--single" : ""}`}
          >
            <label>
              <span>{isOpenAllDay ? "운영 시작" : "시작"}</span>
              <AdminSelect
                className="admin-room-form-select"
                value={openTime}
                options={startTimeSelectOptions}
                onChange={setOpenTime}
              />
            </label>
            {!isOpenAllDay && (
              <label>
                <span>종료</span>
                <AdminSelect
                  className="admin-room-form-select"
                  value={closeTime}
                  options={startTimeSelectOptions}
                  onChange={setCloseTime}
                />
              </label>
            )}
          </div>
          {isOpenAllDay && (
            <p className="admin-room-time-help">
              운영 시작 시간은 예약 페이지에서 보이는 날짜의 첫 시간이며 쉬는날
              설정 기준으로도 사용됩니다.
            </p>
          )}
          <ToggleRow
            label="24시간 운영"
            checked={isOpenAllDay}
            onChange={setIsOpenAllDay}
          />
          <ToggleRow
            label="활성 상태"
            checked={isActive}
            onChange={setIsActive}
          />
        </section>
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
        <button type="button" onClick={onBack}>
          취소
        </button>
        <button type="button" onClick={submit}>
          {submitLabel}
        </button>
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
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
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

  const endTimeSelectOptions = halfHourTimeOptions.filter(
    (o) => o.value > draft.startTime,
  );

  const handleStartTimeChange = (startTime: string) => {
    updateDraft({
      startTime,
      endTime:
        draft.endTime <= startTime
          ? (halfHourTimeOptions[
              halfHourTimeOptions.findIndex((o) => o.value === startTime) + 1
            ]?.value ?? "24:00")
          : draft.endTime,
    });
  };

  const isVacation = draft.type === "휴무";

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="쉬는날 추가" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <p className="admin-room-form-description">
          설정한 날짜/시간은 신규 예약이 불가능합니다.
        </p>

        {/* ── 적용 대상 ── */}
        <section className="admin-room-form-card">
          <h3>적용 대상 *</h3>
          <div className="admin-room-target-tabs">
            <button
              className={draft.targetType === "all" ? "is-active" : ""}
              type="button"
              onClick={() =>
                updateDraft({ targetType: "all", roomName: "전체 합주실" })
              }
            >
              전체 합주실
            </button>
            <button
              className={draft.targetType === "single" ? "is-active" : ""}
              type="button"
              onClick={() =>
                updateDraft({
                  targetType: "single",
                  roomName: rooms[0]?.name ?? "B201",
                })
              }
            >
              특정 합주실
            </button>
          </div>
          {draft.targetType === "single" && (
            <AdminSelect
              className="admin-room-form-select"
              value={draft.roomName}
              options={rooms.map((room) => ({
                value: room.name,
                label: room.name,
              }))}
              onChange={(roomName) => updateDraft({ roomName })}
            />
          )}
        </section>

        {/* ── 쉬는날 유형 ── */}
        <label className="admin-form-field">
          <span>쉬는날 유형 *</span>
          <AdminSelect<AdminRoomDayOffType>
            className="admin-room-form-select admin-room-form-select--sm"
            value={draft.type}
            options={[
              { value: "점검", label: "점검" },
              { value: "휴무", label: "휴무" },
              { value: "기타", label: "기타" },
            ]}
            onChange={(type) => updateDraft({ type })}
          />
        </label>

        {isVacation ? (
          /* ── 휴무: 시작 날짜 / 종료 날짜 / 사유 ── */
          <>
            <label className="admin-form-field">
              <span>시작 날짜 *</span>
              <AdminDayPicker
                className="admin-room-form-select admin-room-form-select--sm"
                value={draft.dateLabel}
                onChange={(dateLabel) => updateDraft({ dateLabel })}
              />
            </label>
            <label className="admin-form-field">
              <span>종료 날짜 *</span>
              <AdminDayPicker
                className="admin-room-form-select admin-room-form-select--sm"
                value={draft.endDateLabel}
                onChange={(endDateLabel) => updateDraft({ endDateLabel })}
              />
            </label>
            <label className="admin-form-field">
              <span>사유</span>
              <textarea
                value={draft.reason}
                maxLength={100}
                onChange={(event) =>
                  updateDraft({ reason: event.target.value })
                }
              />
              <em>{draft.reason.length}/100</em>
            </label>
          </>
        ) : (
          /* ── 점검 / 기타: 날짜 + 시간대 + 사유 ── */
          <>
            <label className="admin-form-field">
              <span>날짜 *</span>
              <AdminDayPicker
                className="admin-room-form-select admin-room-form-select--sm"
                value={draft.dateLabel}
                onChange={(dateLabel) => updateDraft({ dateLabel })}
              />
            </label>
            <section className="admin-room-form-card">
              <ToggleRow
                label="하루 전체"
                checked={draft.isAllDay}
                onChange={(checked) => updateDraft({ isAllDay: checked })}
              />
              <label className="admin-form-field">
                <span>시작 시간 *</span>
                <AdminSelect
                  className="admin-room-form-select admin-room-form-select--sm"
                  value={draft.startTime}
                  disabled={draft.isAllDay}
                  options={startTimeSelectOptions}
                  onChange={handleStartTimeChange}
                />
              </label>
              <label className="admin-form-field">
                <span>종료 시간 *</span>
                <AdminSelect
                  className="admin-room-form-select admin-room-form-select--sm"
                  value={draft.endTime}
                  disabled={draft.isAllDay}
                  options={endTimeSelectOptions}
                  onChange={(endTime) => updateDraft({ endTime })}
                />
              </label>
              <label className="admin-form-field">
                <span>사유</span>
                <textarea
                  value={draft.reason}
                  maxLength={100}
                  onChange={(event) =>
                    updateDraft({ reason: event.target.value })
                  }
                />
                <em>{draft.reason.length}/100</em>
              </label>
            </section>
          </>
        )}

        <div className="admin-room-warning-box">
          <AdminWarningIcon />
          <p>승인 대기 및 승인 완료된 예약이 있는지 함께 확인해주세요.</p>
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>
          취소
        </button>
        <button type="button" onClick={() => onCheck(draft)}>
          확인하기
        </button>
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
          <p>
            <span>대상</span>
            <strong>
              {draft.targetType === "all" ? "전체 합주실" : draft.roomName}
            </strong>
          </p>
          <p>
            <span>날짜</span>
            <strong>
              {draft.type === "휴무"
                ? `${getDateLabelWithDay(draft.dateLabel)} ~ ${getDateLabelWithDay(draft.endDateLabel)}`
                : getDateLabelWithDay(draft.dateLabel)}
            </strong>
          </p>
          <p>
            <span>시간</span>
            <strong>
              {draft.type === "휴무" || draft.isAllDay
                ? "하루전체"
                : `${draft.startTime}~${draft.endTime}`}
            </strong>
          </p>
          <p>
            <span>유형</span>
            <strong className="admin-impact-type">{draft.type}</strong>
          </p>
          <p>
            <span>사유</span>
            <strong>{draft.reason}</strong>
          </p>
        </div>
      </section>
      <div className="admin-room-warning-box">
        <AdminWarningIcon />
        <p>
          선택한 기간과 겹치는 예약이 있습니다. 최종 생성을 위해 확인이
          필요합니다.
        </p>
      </div>
      <h3 className="admin-users__section-title">
        영향을 받는 예약 {reservations.length}건
      </h3>
      <div className="admin-impact-list">
        {reservations.map((reservation) => (
          <article className="admin-impact-card" key={reservation.id}>
            <AdminRoomIcon />
            <div>
              <h3>{reservation.roomName}</h3>
              <p>
                <span>날짜/시간</span>
                <strong>{reservation.dateTime}</strong>
              </p>
              <p>
                <span>예약자</span>
                <strong>{reservation.reserver}</strong>
              </p>
            </div>
            <section>
              <strong
                className={
                  reservation.status === "승인 완료"
                    ? "is-approved"
                    : "is-pending"
                }
              >
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
        <p>
          쉬는날로 설정한 기간의 기존 예약, 승인 완료 예약, 승인 대기 예약은
          모두 취소된 후 쉬는날이 설정됩니다.
        </p>
      </div>
    </div>
    <footer className="admin-sub-actions">
      <button type="button" onClick={onBack}>
        이전으로
      </button>
      <button className="is-danger" type="button" onClick={onConfirm}>
        최종 생성
      </button>
    </footer>
  </section>
);

export default AdminRoomPanel;
