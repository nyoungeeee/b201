import {
  AdminCalendarIcon,
  AdminChevronRightIcon,
  AdminPersonIcon,
  AdminReservationIcon,
  AdminTeamIcon,
} from "../icons";
import { formatReservationCardDate, formatReservationPeriod } from "./formatReservation";
import type { AdminReservation } from "./types";

type AdminReservationCardProps = {
  reservation: AdminReservation;
  onSelect: (reservation: AdminReservation) => void;
  onApprove: (id: number) => void;
};

const AdminReservationCard = ({ reservation, onSelect, onApprove }: AdminReservationCardProps) => {
  const isPending = reservation.status === "pending";
  const reservationDate = formatReservationCardDate(reservation);

  return (
    <article
      className={`admin-reservation-card admin-reservation-card--${reservation.kind}`}
      onClick={() => onSelect(reservation)}
    >
      <div className="admin-reservation-card__body">
        <div className="admin-reservation-card__top">
          <span className="admin-reservation-card__badge">
            {reservation.kind === "single" ? "단건" : "반복"}
          </span>
          <button
            className="admin-reservation-card__more"
            type="button"
            aria-label="예약 상세 보기"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(reservation);
            }}
          >
            <AdminChevronRightIcon />
          </button>
        </div>

        <h3 className="admin-reservation-card__title">
          {reservationDate} {reservation.timeLabel}
        </h3>

        <div className="admin-reservation-card__meta">
          {reservation.periodLabel && (
            <p>
              <AdminCalendarIcon />
              <span>기간 {formatReservationPeriod(reservation.periodLabel)}</span>
            </p>
          )}
          <p>
            <AdminReservationIcon />
            <span>{reservation.room}</span>
          </p>
          {reservation.teamName && (
            <p>
              <AdminTeamIcon />
              <span>팀: {reservation.teamName}</span>
            </p>
          )}
          <p>
            <AdminPersonIcon />
            <span>{reservation.teamName ? "예약자" : "개인 예약"}: {reservation.reserverName}</span>
          </p>
        </div>

        {isPending ? (
          <button
            className="admin-reservation-card__approve"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onApprove(reservation.id);
            }}
          >
            승인하기
          </button>
        ) : (
          <span className="admin-reservation-card__approved">승인 완료</span>
        )}
      </div>
    </article>
  );
};

export default AdminReservationCard;
