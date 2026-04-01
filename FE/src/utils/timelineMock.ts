export type TimelineReservation = {
    id: number;
    title: string;
    rowHour: number;
    color: string;
    darkText?: boolean;
    span?: number;
};

export const timelineHours = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
    "00:00",
    "01:00",
    "02:00",
    "03:00",
    "04:00",
    "05:00",
    "06:00",
    "07:00",
    "08:00",
];

export const timelineReservations: TimelineReservation[] = [
    {
        id: 1,
        title: "Medicine For Sleep",
        rowHour: 9,
        color: "var(--team-01)",
        span: 1,
    },
    {
        id: 2,
        title: "실리카겔",
        rowHour: 10,
        color: "var(--team-02)",
        span: 1,
    },
    {
        id: 3,
        title: "유다빈밴드(신청중)",
        rowHour: 10,
        color: "var(--team-10)",
        span: 1,
    },
    {
        id: 4,
        title: "브로콜리너마저",
        rowHour: 11,
        color: "var(--team-04)",
        darkText: true,
        span: 1,
    },
    {
        id: 5,
        title: "Sun'Soo",
        rowHour: 14,
        color: "var(--team-12)",
        span: 1,
    },
    {
        id: 6,
        title: "Sun'Soo",
        rowHour: 15,
        color: "var(--team-12)",
        span: 1,
    },
    {
        id: 7,
        title: "아바바",
        rowHour: 16,
        color: "var(--person-01)",
        span: 1,
    },
    {
        id: 8,
        title: "Khris",
        rowHour: 19,
        color: "var(--person-01)",
        span: 1,
    },
    {
        id: 9,
        title: "Green Day",
        rowHour: 20,
        color: "var(--team-05)",
        darkText: true,
        span: 1,
    },
    {
        id: 10,
        title: "Green Day",
        rowHour: 21,
        color: "var(--team-05)",
        darkText: true,
        span: 1,
    },
    {
        id: 11,
        title: "Green Day(신청중)",
        rowHour: 22,
        color: "var(--team-05)",
        darkText: true,
        span: 1,
    },
    {
        id: 12,
        title: "WK 밴드",
        rowHour: 8,
        color: "var(--team-03)",
        darkText: true,
        span: 1,
    },
];