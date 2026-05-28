import { useState } from "react";

import { AdminChevronDownIcon } from "../icons";

const DAY_LABELS_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_LABELS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

type AdminDayPickerProps = {
  value: string; // "YYYY.MM.DD"
  onChange: (value: string) => void;
  className?: string;
  minValue?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

const formatValue = (year: number, month: number, day: number) =>
  `${year}.${pad(month)}.${pad(day)}`;

const parseValue = (value: string) => {
  const [year, month, day] = value.split(".").map(Number);
  return { year, month, day };
};

const getDayName = (year: number, month: number, day: number) =>
  DAY_LABELS_FULL[new Date(year, month - 1, day).getDay()];

const getCalendarCells = (viewYear: number, viewMonth: number) => {
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();

  const cells: { year: number; month: number; day: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const month = viewMonth === 1 ? 12 : viewMonth - 1;
    const year = viewMonth === 1 ? viewYear - 1 : viewYear;
    cells.push({ year, month, day: prevMonthDays - i, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year: viewYear, month: viewMonth, day: d, isCurrentMonth: true });
  }

  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++) {
    const month = viewMonth === 12 ? 1 : viewMonth + 1;
    const year = viewMonth === 12 ? viewYear + 1 : viewYear;
    cells.push({ year, month, day: d, isCurrentMonth: false });
  }

  return cells;
};

const AdminDayPicker = ({
  value,
  onChange,
  className = "admin-room-form-select admin-room-form-select--sm",
  minValue,
}: AdminDayPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { year: selYear, month: selMonth, day: selDay } = parseValue(value);

  const [viewYear, setViewYear] = useState(selYear);
  const [viewMonth, setViewMonth] = useState(selMonth);

  const today = new Date();
  const todayValue = formatValue(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const cells = getCalendarCells(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelect = (cellValue: string) => {
    if (minValue && cellValue < minValue) {
      return;
    }

    const { year, month } = parseValue(cellValue);
    setIsOpen(false);
    setViewYear(year);
    setViewMonth(month);
    onChange(cellValue);
  };

  return (
    <div
      className={`${className} admin-custom-select admin-day-picker${isOpen ? " is-open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className="admin-custom-select__button"
        type="button"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span>
          {value} {getDayName(selYear, selMonth, selDay)}
        </span>
        <AdminChevronDownIcon size={18} />
      </button>

      {isOpen && (
        <div className="admin-day-picker__calendar">
          <div className="admin-day-picker__header">
            <button
              type="button"
              className="admin-day-picker__nav"
              onClick={prevMonth}
            >
              ‹
            </button>
            <span className="admin-day-picker__title">
              {viewYear}년 {viewMonth}월
            </span>
            <button
              type="button"
              className="admin-day-picker__nav"
              onClick={nextMonth}
            >
              ›
            </button>
          </div>

          <div className="admin-day-picker__weekdays">
            {DAY_LABELS_SHORT.map((label, i) => (
              <span
                key={label}
                className={i === 0 ? "is-sun" : i === 6 ? "is-sat" : ""}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="admin-day-picker__grid">
            {cells.map(({ year, month, day, isCurrentMonth }, index) => {
              const cellValue = formatValue(year, month, day);
              const isSelected = cellValue === value;
              const isToday = cellValue === todayValue;
              const isDisabled = Boolean(minValue && cellValue < minValue);
              const isSun = new Date(year, month - 1, day).getDay() === 0;
              const isSat = new Date(year, month - 1, day).getDay() === 6;

              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    isSelected && "is-selected",
                    isToday && !isSelected && "is-today",
                    isDisabled && "is-disabled",
                    !isCurrentMonth && "is-other-month",
                    isSun && !isSelected && !isDisabled && "is-sun",
                    isSat && !isSelected && !isDisabled && "is-sat",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isDisabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(cellValue)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDayPicker;
