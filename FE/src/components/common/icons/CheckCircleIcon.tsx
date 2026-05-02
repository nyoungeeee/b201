const CheckCircleIcon = ({
    size = 18,
    color = 'var(--text-success)',
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
            <circle cx="12" cy="12" r="10" fill={color} />
            <path
                d="M8 12.5L11 15.5L16 9.5"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default CheckCircleIcon;