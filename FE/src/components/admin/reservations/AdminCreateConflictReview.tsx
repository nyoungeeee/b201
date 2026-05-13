import {
  AdminArrowLeftIcon,
  AdminCalendarIcon,
  AdminPersonIcon,
  AdminReservationIcon,
  AdminTeamIcon,
  AdminWarningIcon,
} from "../icons";
import type { AdminReservationConflict, NewAdminReservation } from "./types";

type AdminCreateConflictReviewProps = {
  reservation: NewAdminReservation;
  conflicts: AdminReservationConflict[];
  onBack: () => void;
  onConfirm: () => void;
};

const formatReservationDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} (${weekdays[parsedDate.getDay()]})`;
};

const AdminCreateConflictReview = ({
  reservation,
  conflicts,
  onBack,
  onConfirm,
}: AdminCreateConflictReviewProps) => {
  return (
    <section className="admin-create-conflict" aria-label="충돌 예약 확인">
      <header className="admin-create-conflict__header">
        <button className="admin-create-conflict__back" type="button" aria-label="이전으로" onClick={onBack}>
          <AdminArrowLeftIcon />
        </button>
        <h2>충돌 예약 확인</h2>
      </header>

      <div className="admin-create-conflict__content">
        <section className="admin-create-conflict-summary">
          <span className="admin-create-conflict-summary__badge">사장님 전용</span>
          <h3>
            {formatReservationDate(reservation.date)} {reservation.startTime}~{reservation.endTime}
          </h3>
          <p>
            <AdminReservationIcon />
            {reservation.room}
          </p>
          <p>
            <AdminPersonIcon />
            예약명: {reservation.title}
          </p>
        </section>

        <div className="admin-create-conflict-notice">
          <AdminWarningIcon />
          <p>아래 예약은 새 예약과 시간이 겹치며, 최종 생성 시 자동으로 취소됩니다.</p>
        </div>

        <h3 className="admin-create-conflict__section-title">영향을 받는 예약 {conflicts.length}건</h3>

        <div className="admin-create-conflict-list">
          {conflicts.map((conflict) => (
            <article className="admin-create-conflict-card" key={conflict.id}>
              <div className="admin-create-conflict-card__icon">
                <AdminReservationIcon />
              </div>
              <div className="admin-create-conflict-card__body">
                <strong>{conflict.room}</strong>
                <p>
                  <AdminCalendarIcon />
                  {conflict.date} {conflict.timeLabel}
                </p>
                <p>
                  <AdminTeamIcon />
                  {conflict.ownerLabel}
                </p>
              </div>
              <span className={`admin-create-conflict-card__status is-${conflict.status}`}>
                {conflict.status === "approved" ? "승인 완료" : "승인 대기"}
              </span>
            </article>
          ))}
        </div>
      </div>

      <footer className="admin-create-conflict-actions">
        <p>
          <AdminWarningIcon size={20} />
          최종 생성 후 취소된 기존 예약은 되돌릴 수 없습니다.
        </p>
        <div>
          <button type="button" onClick={onBack}>
            이전으로
          </button>
          <button type="button" onClick={onConfirm}>
            최종 생성
          </button>
        </div>
      </footer>
    </section>
  );
};

export default AdminCreateConflictReview;
