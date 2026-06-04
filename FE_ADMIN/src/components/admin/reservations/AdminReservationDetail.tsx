import { useMemo, useState, type ReactNode } from "react";

import {
  AdminArrowLeftIcon,
  AdminCalendarIcon,
  AdminChevronRightIcon,
  AdminClockIcon,
  AdminMemoIcon,
  AdminPersonIcon,
  AdminRepeatIcon,
  AdminReservationIcon,
  AdminStatusIcon,
  AdminTeamIcon,
} from "../icons";
import {
  formatRepeatWeekdays,
  formatReservationDetailDate,
  formatReservationPeriod,
} from "./formatReservation";
import type { AdminReservation } from "./types";

type AdminReservationDetailProps = {
  reservation: AdminReservation;
  onBack: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onRejectOccurrences: (id: number, canceledDates: string[]) => void;
  onOpenUser?: (userId: number) => void;
  onOpenTeam?: (teamId: number) => void;
};

type RepeatOccurrence = {
  date: string;
  label: string;
};

const weekdayMap: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatOccurrenceLabel = (date: Date, timeLabel: string) => {
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} ${weekdays[date.getDay()]} ${timeLabel}`;
};

const formatCanceledDateLabel = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue.replaceAll("-", ".");
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} ${weekdays[date.getDay()]}`;
};

const parsePeriodDate = (value: string, year: number) => {
  const [month, day] = value.split(".").map(Number);

  return new Date(year, month - 1, day);
};

const getRepeatWeekdays = (dateLabel: string) => {
  return dateLabel
    .replace("매주", "")
    .split("/")
    .map((day) => day.trim())
    .map((day) => weekdayMap[day])
    .filter((day): day is number => day !== undefined);
};

const getRemainingOccurrences = (reservation: AdminReservation) => {
  if (!reservation.periodLabel) {
    return [];
  }

  const today = new Date();
  const periodYear = today.getFullYear();
  const [startLabel, endLabel] = reservation.periodLabel.split("~");
  const startDate = parsePeriodDate(startLabel, periodYear);
  const endDate = parsePeriodDate(endLabel, periodYear);
  const cursor = new Date(Math.max(startDate.getTime(), new Date(periodYear, today.getMonth(), today.getDate()).getTime()));
  const weekdays = getRepeatWeekdays(reservation.dateLabel);
  const canceledDates = new Set(reservation.canceledOccurrenceDates ?? []);
  const occurrences: RepeatOccurrence[] = [];

  while (cursor <= endDate) {
    const dateKey = toDateKey(cursor);

    if (weekdays.includes(cursor.getDay()) && !canceledDates.has(dateKey)) {
      occurrences.push({
        date: dateKey,
        label: formatOccurrenceLabel(cursor, reservation.timeLabel),
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
};

const DetailRow = ({
  icon,
  label,
  value,
  isLink = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isLink?: boolean;
  onClick?: () => void;
}) => {
  const content = (
    <>
      {value}
      {isLink && <AdminChevronRightIcon size={20} />}
    </>
  );

  return (
    <div className="admin-detail-row">
      <span className="admin-detail-row__icon">{icon}</span>
      <span className="admin-detail-row__label">{label}</span>
      {onClick ? (
        <button className={`admin-detail-row__value${isLink ? " is-link" : ""}`} type="button" onClick={onClick}>
          {content}
        </button>
      ) : (
        <span className={`admin-detail-row__value${isLink ? " is-link" : ""}`}>{content}</span>
      )}
    </div>
  );
};

const AdminReservationDetail = ({
  reservation,
  onBack,
  onApprove,
  onReject,
  onRejectOccurrences,
  onOpenUser,
  onOpenTeam,
}: AdminReservationDetailProps) => {
  const isPending = reservation.status === "pending";
  const reservationType = reservation.kind === "repeat" ? "반복 예약" : "단건 예약";
  const statusLabel = isPending ? "승인 대기" : "승인 완료";
  const isRepeatReservation = reservation.kind === "repeat";
  const repeatDays = formatRepeatWeekdays(reservation.dateLabel);
  const [selectedOccurrenceDates, setSelectedOccurrenceDates] = useState<string[]>([]);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const remainingOccurrences = useMemo(() => getRemainingOccurrences(reservation), [reservation]);
  const canceledOccurrenceLabels = useMemo(
    () => [...(reservation.canceledOccurrenceDates ?? [])].sort().map(formatCanceledDateLabel),
    [reservation.canceledOccurrenceDates],
  );
  const canSelectOccurrences = !isPending && isRepeatReservation;
  const areAllOccurrencesSelected =
    remainingOccurrences.length > 0 && selectedOccurrenceDates.length === remainingOccurrences.length;

  const handleOccurrenceToggle = (date: string) => {
    setSelectedOccurrenceDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((currentDate) => currentDate !== date)
        : [...currentDates, date],
    );
  };

  const handleAllOccurrencesToggle = () => {
    setSelectedOccurrenceDates(
      areAllOccurrencesSelected ? [] : remainingOccurrences.map((occurrence) => occurrence.date),
    );
  };

  const handleApprovedReject = () => {
    if (!isRepeatReservation) {
      onReject(reservation.id);
      return;
    }

    if (canSelectOccurrences && selectedOccurrenceDates.length > 0) {
      onRejectOccurrences(reservation.id, selectedOccurrenceDates);
      setSelectedOccurrenceDates([]);
      return;
    }

    setIsRejectConfirmOpen(true);
  };

  return (
    <section className="admin-detail" aria-label="예약 상세">
      <header className="admin-detail__header">
        <button className="admin-detail__back" type="button" aria-label="뒤로가기" onClick={onBack}>
          <AdminArrowLeftIcon />
        </button>
        <h2>예약 상세</h2>
      </header>

      <div className="admin-detail__content">
        <div className="admin-detail__status">
          <AdminStatusIcon />
          {statusLabel}
        </div>

        <span className={`admin-detail__badge admin-detail__badge--${reservation.kind}`}>
          {reservation.kind === "single" ? "단건" : "반복"}
        </span>

        <section className="admin-detail-card">
          <h3>
            <span>
              <AdminCalendarIcon size={26} />
            </span>
            예약 정보
          </h3>
          <div className="admin-detail-card__rows">
            <DetailRow icon={<AdminRepeatIcon />} label="예약 유형" value={reservationType} />
            <DetailRow icon={<AdminReservationIcon />} label="예약 룸" value={reservation.room} />
            <DetailRow
              icon={<AdminClockIcon />}
              label="예약 시간"
              value={reservation.timeLabel}
            />
            <DetailRow
              icon={<AdminCalendarIcon />}
              label={isRepeatReservation ? "반복 기간" : "예약 날짜"}
              value={
                isRepeatReservation
                  ? formatReservationPeriod(reservation.periodLabel)
                  : formatReservationDetailDate(reservation.dateLabel)
              }
            />
            {isRepeatReservation && (
              <DetailRow icon={<AdminRepeatIcon />} label="반복 요일" value={repeatDays} />
            )}
          </div>
        </section>

        <section className="admin-detail-card">
          <h3>
            <span>
              <AdminPersonIcon size={26} />
            </span>
            예약자 정보
          </h3>
          <div className="admin-detail-card__rows">
            {reservation.teamName && (
              <DetailRow
                icon={<AdminTeamIcon />}
                label="팀명"
                value={reservation.teamName}
                isLink
                onClick={reservation.teamId ? () => onOpenTeam?.(reservation.teamId!) : undefined}
              />
            )}
            <DetailRow
              icon={<AdminPersonIcon />}
              label="예약자"
              value={reservation.reserverName}
              isLink
              onClick={reservation.reserverUserId ? () => onOpenUser?.(reservation.reserverUserId!) : undefined}
            />
          </div>
        </section>

        <section className="admin-detail-card admin-detail-card--memo">
          <h3>
            <span>
              <AdminMemoIcon size={26} />
            </span>
            신청 메모
          </h3>
          <p>{reservation.memo || "등록된 메모가 없습니다."}</p>
        </section>

        {canceledOccurrenceLabels.length > 0 && (
          <section className="admin-detail-card admin-conflict-dates">
            <h3>
              <span>
                <AdminCalendarIcon size={26} />
              </span>
              충돌 날짜
            </h3>
            <div className="admin-conflict-dates__list">
              {canceledOccurrenceLabels.map((dateLabel) => (
                <span className="admin-conflict-dates__item" key={dateLabel}>
                  {dateLabel}
                </span>
              ))}
            </div>
          </section>
        )}

        {canSelectOccurrences && (
          <section className="admin-detail-card admin-repeat-cancel">
            <div className="admin-repeat-cancel__header">
              <h3>
                <span>
                  <AdminCalendarIcon size={26} />
                </span>
                남은 예약
              </h3>
              <label className="admin-repeat-cancel__all">
                <input
                  type="checkbox"
                  checked={areAllOccurrencesSelected}
                  onChange={handleAllOccurrencesToggle}
                  disabled={remainingOccurrences.length === 0}
                />
                전체 선택
              </label>
            </div>

            {remainingOccurrences.length > 0 ? (
              <div className="admin-repeat-cancel__list">
                {remainingOccurrences.map((occurrence) => (
                  <label className="admin-repeat-cancel__item" key={occurrence.date}>
                    <input
                      type="checkbox"
                      checked={selectedOccurrenceDates.includes(occurrence.date)}
                      onChange={() => handleOccurrenceToggle(occurrence.date)}
                    />
                    <span>{occurrence.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="admin-repeat-cancel__empty">남은 예약이 없습니다.</p>
            )}
          </section>
        )}
      </div>

      <footer className="admin-detail-actions">
        {isPending ? (
          <>
            <button
              className="admin-detail-actions__reject"
              type="button"
              onClick={() => onReject(reservation.id)}
            >
              거절하기
            </button>
            <button
              className="admin-detail-actions__approve"
              type="button"
              onClick={() => onApprove(reservation.id)}
            >
              승인하기
            </button>
          </>
        ) : (
          <button
            className="admin-detail-actions__reject admin-detail-actions__reject--wide"
            type="button"
            onClick={handleApprovedReject}
          >
            취소하기
          </button>
        )}
      </footer>

      {isRejectConfirmOpen && (
        <div className="admin-reject-modal" role="dialog" aria-modal="true" aria-label="예약 전체 취소 확인">
          <div className="admin-reject-modal__panel">
            <h3>모든 예약을 취소 하시겠습니까?</h3>
            <p>선택한 날짜가 없으면 이 반복 예약 전체가 거절됩니다.</p>
            <div className="admin-reject-modal__actions">
              <button type="button" onClick={() => setIsRejectConfirmOpen(false)}>
                선택하기
              </button>
              <button type="button" onClick={() => onReject(reservation.id)}>
                전체 거절
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminReservationDetail;
