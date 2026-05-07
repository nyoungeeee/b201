const ChevronRightIcon = ({
    size = 20,
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
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default ChevronRightIcon;