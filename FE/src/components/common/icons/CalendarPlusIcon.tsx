const CalendarPlusIcon = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            d="M15 20H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
        />
        <path d="M7 2.5v4M14 2.5v4M3 9h15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18.5 14v7M15 17.5h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

export default CalendarPlusIcon;
