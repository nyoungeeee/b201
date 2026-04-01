import { useEffect, useState } from "react";
import { fetchReservations, type Reservation } from "../apis/reservationApis";



export const useReservations = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    useEffect(() => {
        const loadReservations = async () => {
            const data = await fetchReservations();
            setReservations(data);
        }
        loadReservations();
    }, []);

    return reservations;
}