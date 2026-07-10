const ClipboardCheckIcon = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            d="M8 17H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v1"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
        />
        <rect x="9" y="8" width="11" height="13" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
        <path
            d="m12 14 2 2 3.5-4"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default ClipboardCheckIcon;
