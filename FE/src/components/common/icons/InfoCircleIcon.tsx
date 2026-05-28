const InfoCircleIcon = ({
    size = 20,
    color = 'var(--text-muted)',
}: {
    size?: number;
    color?: string;
}) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: 'block' }}
        >
            {/* 배경 원 */}
            <circle cx="12" cy="12" r="10" fill={color} />

            {/* 느낌표 (세로선) */}
            <rect x="11" y="6" width="2" height="8" rx="1" fill="#1C1917" />

            {/* 느낌표 점 */}
            <circle cx="12" cy="17" r="1.2" fill="#1C1917" />
        </svg>
    );
};

export default InfoCircleIcon;