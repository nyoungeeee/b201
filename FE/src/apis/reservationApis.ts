export interface Reservation {
    id: number;
    teamName: string;
    userName: string;
    startTime: string;
    endTime: string;
}

// 더미데이터 넣고 내보내기
export const fetchReservations = async (): Promise<Reservation[]> => {

    return Promise.resolve([
        {
            id: 1,
            teamName: "팀1",
            userName: "사람1",
            startTime: "10:00",
            endTime: "11:30",
        }, {
            id: 2,
            teamName: "팀2",
            userName: "사람2",
            startTime: "14:00",
            endTime: "16:00",
        }
    ])
}
