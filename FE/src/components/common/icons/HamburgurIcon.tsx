const HamburgerIcon = ({
    size = 24,
    color = 'currentColor',
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
            style={{ display: 'block', color }}
        >
            <path
                d="M4 6H20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M4 12H20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M4 18H20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default HamburgerIcon;