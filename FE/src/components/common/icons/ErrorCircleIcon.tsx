const ErrorCircleIcon = ({
    size = 18,
    color = 'var(--text-error)',
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
                d="M9 9L15 15M15 9L9 15"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default ErrorCircleIcon;