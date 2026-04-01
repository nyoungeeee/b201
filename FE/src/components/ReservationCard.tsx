import { formatTimeRange } from "../utils/formatTime";

interface ReservationCardProps {
    teamName: string;
    userName: string;
    startTime: string;
    endTime: string;
}

const ReservationCard = ({
    teamName,
    userName,
    startTime,
    endTime,
}: ReservationCardProps) => {
    return (
        <div style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "12px",
            backgroundColor: "#fff",
        }}>
            <h3 style={{ margin: "0 0 8px" }}>{teamName}</h3>
            <p style={{ margin: "0 0 4px" }}>
                예약자: {userName}
            </p>
            <p style={{ margin: 0 }}>
                시간: {formatTimeRange(startTime, endTime)}
            </p>
        </div>
    )
}

export default ReservationCard;