export type CalendarDay = {
    date: number;
    isCurrentMonth: boolean;
    isSelected?: boolean;
    isSunday?: boolean;
    isSaturday?: boolean;
    dots?: string[];
};

export const calendarDays: CalendarDay[] = [
    { date: 27, isCurrentMonth: false, isSunday: true },
    { date: 28, isCurrentMonth: false },
    { date: 29, isCurrentMonth: false },
    { date: 30, isCurrentMonth: false },
    { date: 1, isCurrentMonth: true, dots: ["var(--team-02)"] },
    { date: 2, isCurrentMonth: true },
    { date: 3, isCurrentMonth: true, isSaturday: true, dots: ["var(--team-06)", "var(--team-01)", "var(--team-15)"] },

    { date: 4, isCurrentMonth: true, isSunday: true, dots: ["var(--team-01)", "var(--team-04)", "var(--team-06)"] },
    { date: 5, isCurrentMonth: true },
    { date: 6, isCurrentMonth: true },
    { date: 7, isCurrentMonth: true },
    { date: 8, isCurrentMonth: true, dots: ["var(--team-02)"] },
    { date: 9, isCurrentMonth: true, dots: ["var(--team-10)", "var(--team-04)"] },
    { date: 10, isCurrentMonth: true, isSaturday: true, dots: ["var(--team-06)", "var(--team-03)", "var(--team-01)"] },

    { date: 11, isCurrentMonth: true, isSunday: true, dots: ["var(--team-02)", "var(--team-10)", "var(--team-08)"] },
    { date: 12, isCurrentMonth: true },
    { date: 13, isCurrentMonth: true },
    { date: 14, isCurrentMonth: true },
    { date: 15, isCurrentMonth: true, dots: ["var(--team-02)"] },
    { date: 16, isCurrentMonth: true },
    { date: 17, isCurrentMonth: true, isSaturday: true },

    { date: 18, isCurrentMonth: true, isSunday: true, dots: ["var(--team-01)", "var(--team-10)", "var(--team-08)"] },
    { date: 19, isCurrentMonth: true },
    { date: 20, isCurrentMonth: true },
    { date: 21, isCurrentMonth: true },
    { date: 22, isCurrentMonth: true, dots: ["var(--team-02)"] },
    { date: 23, isCurrentMonth: true, isSelected: true, dots: ["var(--team-01)", "var(--team-10)", "var(--team-15)"] },
    { date: 24, isCurrentMonth: true, isSaturday: true },

    { date: 25, isCurrentMonth: true, isSunday: true, dots: ["var(--team-01)", "var(--team-10)", "var(--team-08)"] },
    { date: 26, isCurrentMonth: true },
    { date: 27, isCurrentMonth: true, dots: ["var(--team-01)", "var(--team-10)", "var(--team-15)"] },
    { date: 28, isCurrentMonth: true },
    { date: 29, isCurrentMonth: true, dots: ["var(--team-02)"] },
    { date: 30, isCurrentMonth: true },
    { date: 31, isCurrentMonth: true, isSaturday: true, dots: ["var(--team-06)", "var(--team-10)", "var(--team-01)"] },

    { date: 1, isCurrentMonth: false, isSunday: true },
    { date: 2, isCurrentMonth: false },
    { date: 3, isCurrentMonth: false },
    { date: 4, isCurrentMonth: false },
    { date: 5, isCurrentMonth: false },
    { date: 6, isCurrentMonth: false },
    { date: 7, isCurrentMonth: false, isSaturday: true },
];