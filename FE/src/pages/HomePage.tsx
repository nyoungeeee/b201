import logo from "../assets/B201_logo.png";
import ReservationCard from "../components/ReservationCard";
import { useReservations } from "../hooks/useReservations";

const HomePage = () => {
    const reservations = useReservations();

    return (
        <div style={{
            maxWidth: "480px",
            margin: "0 auto",
            padding: "24px",
            backgroundColor: "#f7f7f7",
            minHeight: "100vh",
        }}>
            <img
                src={logo}
                alt="B201 로고"
                style={{ width: "80px", marginBottom: "16px" }}
            />
            <h1 style={{ marginBottom: "20px" }}>B201 오늘의 예약</h1>
            {reservations.length === 0 ? (
                <p>데이터 없음</p>
            ) : (
                reservations.map((reservation) => (
                    <ReservationCard
                        key={reservation.id}
                        teamName={reservation.teamName}
                        userName={reservation.userName}
                        startTime={reservation.startTime}
                        endTime={reservation.endTime}
                    />
                ))
            )}
        </div>
    );
}

export default HomePage;