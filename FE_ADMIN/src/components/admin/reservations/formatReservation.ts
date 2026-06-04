import type { AdminReservation } from "./types";

const DISPLAY_YEAR = 2026;

const weekdayNames: Record<string, string> = {
  일: "일요일",
  월: "월요일",
  화: "화요일",
  수: "수요일",
  목: "목요일",
  금: "금요일",
  토: "토요일",
};

const parseSingleDateLabel = (dateLabel: string) => {
  const match = dateLabel.match(/(\d{1,2})\.(\d{1,2})\s*\((.)\)/);

  if (!match) {
    return null;
  }

  const [, month, day, weekday] = match;

  return {
    month: Number(month),
    day: Number(day),
    weekday,
  };
};

const expandWeekday = (weekday: string) => weekdayNames[weekday] ?? weekday;

export const formatRepeatWeekdays = (dateLabel: string) => {
  return dateLabel
    .replace("매주", "")
    .split("/")
    .map((weekday) => expandWeekday(weekday.trim()))
    .join("/");
};

export const formatReservationCardDate = (reservation: AdminReservation) => {
  if (reservation.kind === "repeat") {
    return `매주 ${formatRepeatWeekdays(reservation.dateLabel)}`;
  }

  const parsedDate = parseSingleDateLabel(reservation.dateLabel);

  if (!parsedDate) {
    return reservation.dateLabel;
  }

  return `${parsedDate.month}/${parsedDate.day} ${expandWeekday(parsedDate.weekday)}`;
};

export const formatReservationDetailDate = (dateLabel: string) => {
  const parsedDate = parseSingleDateLabel(dateLabel);

  if (!parsedDate) {
    return dateLabel;
  }

  const month = String(parsedDate.month).padStart(2, "0");
  const day = String(parsedDate.day).padStart(2, "0");

  return `${DISPLAY_YEAR}.${month}.${day} ${expandWeekday(parsedDate.weekday)}`;
};

export const formatReservationPeriod = (periodLabel?: string) => {
  if (!periodLabel) {
    return "";
  }

  return periodLabel
    .split("~")
    .map((datePart) => {
      const [month, day] = datePart.split(".");
      const formattedMonth = String(Number(month)).padStart(2, "0");
      const formattedDay = String(Number(day)).padStart(2, "0");

      return `${DISPLAY_YEAR}.${formattedMonth}.${formattedDay}`;
    })
    .join("~");
};
