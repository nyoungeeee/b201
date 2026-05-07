const PlusCircleIcon = ({
    size = 18,
    color = 'var(--text-success-blue)',
    plusColor = 'var(--bg-primary)',
}: {
    size?: number;
    color?: string;
    plusColor?: string;
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
                d="M12 8V16"
                stroke={plusColor}
                strokeWidth="2"
                strokeLinecap="round"
            />

            <path
                d="M8 12H16"
                stroke={plusColor}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default PlusCircleIcon;